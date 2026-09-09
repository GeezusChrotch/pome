import Foundation
@main struct HomeHTTPTests {
    static func main() async throws {
        let server = CacheHTTP(token: "test-only", port: 0, ownerToken: "owner-only")
        var homeCalls = 0
        server.route = { _, _ in (200, ["camera": true]) }
        server.homeRoute = { method, path, reply in
            homeCalls += 1
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.03) {
                if path == "/home/list/rooms" { reply(200, [["name": "Lounge"]]) }
                else { reply(method == "POST" ? 200 : 405, ["status": "success"]) }
            }
        }
        try server.start(); defer { server.stop() }
        for _ in 0..<100 { if let port = server.boundPort, port != 0 { break }; try await Task.sleep(nanoseconds: 10_000_000) }
        guard let port = server.boundPort, port != 7855, port != 0 else { fatalError("Not an isolated listener") }
        func request(_ path: String, _ method: String = "GET", _ authorized: Bool = true) async throws -> (Int, Any) {
            var request = URLRequest(url: URL(string: "http://127.0.0.1:\(port)" + path)!)
            request.httpMethod = method
            if authorized { request.setValue("Bearer test-only", forHTTPHeaderField: "Authorization") }
            let (data, response) = try await URLSession.shared.data(for: request)
            let http = response as! HTTPURLResponse
            precondition(http.value(forHTTPHeaderField: "Cache-Control") == "no-store")
            return (http.statusCode, try JSONSerialization.jsonObject(with: data))
        }
        let denied = try await request("/home/on/id", "POST", false)
        precondition(denied.0 == 401 && homeCalls == 0, "Authenticate before HomeKit dispatch")
        let rooms = try await request("/home/list/rooms")
        precondition(rooms.0 == 200 && (rooms.1 as! [[String: String]])[0]["name"] == "Lounge")
        let command = try await request("/home/on/id", "POST")
        precondition(command.0 == 200)
        let camera = try await request("/camera-settings")
        precondition((camera.1 as! [String: Bool])["camera"] == true)
        let shutdown = try await request("/service/quit", "POST")
        precondition(shutdown.0 == 403, "Phone HomeKit token must not grant owner shutdown")
        print("PASS: isolated loopback HTTP auth-before-control, async HomeKit replies, JSON arrays, no-store, unchanged camera routing and owner-only shutdown")
    }
}
