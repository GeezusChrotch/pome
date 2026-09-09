import Foundation
import HomeKit

@main struct HomeControlTests {
    static func main() {
        let manager = HMHomeManager(), home = HMHome(), room = HMRoom("Lounge/Den")
        manager.homes = [home]; home.rooms = [room]
        let backend = HomeControl { manager }
        func device(_ name: String, _ type: String, _ cs: [HMCharacteristic]) -> HMService {
            let a = HMAccessory(), s = HMService(name, type)
            a.room = room; a.services = [s]; s.characteristics = cs; home.accessories.append(a); return s
        }
        let power = HMCharacteristic(HMCharacteristicTypePowerState, false)
        let brightness = HMCharacteristic(HMCharacteristicTypeBrightness, 50)
        let hue = HMCharacteristic(HMCharacteristicTypeHue, 20), saturation = HMCharacteristic(HMCharacteristicTypeSaturation, 50)
        let light = device("Lounge/Den Light", HMServiceTypeLightbulb, [power, brightness, hue, saturation])
        let active = HMCharacteristic(HMCharacteristicTypeActive, 0), speed = HMCharacteristic(HMCharacteristicTypeRotationSpeed, 0)
        let fan = device("Fan", HMServiceTypeVentilationFan, [active, speed])
        let switchPower = HMCharacteristic(HMCharacteristicTypePowerState, true)
        let sw = device("Switch", HMServiceTypeSwitch, [switchPower])
        let outlet = device("Plug", HMServiceTypeOutlet, [HMCharacteristic(HMCharacteristicTypePowerState, false)])
        let position = HMCharacteristic(HMCharacteristicTypeTargetPosition, 0)
        let blind = device("Blind", HMServiceTypeWindowCovering, [position, HMCharacteristic(HMCharacteristicTypeCurrentPosition, 0)])
        let temperature = HMCharacteristic(HMCharacteristicTypeCurrentTemperature, 22.5)
        _ = device("Temperature", HMServiceTypeTemperatureSensor, [temperature])
        let scene = HMActionSet("Lounge TV"); home.actionSets = [scene]
        func call(_ method: String, _ path: String) -> (Int, Any) {
            var response: (Int, Any)?
            backend.route(method, "/home" + path) { response = ($0, $1) }
            let deadline = Date().addingTimeInterval(2)
            while response == nil && Date() < deadline { RunLoop.main.run(until: Date().addingTimeInterval(0.002)) }
            precondition(response != nil, "Missing response: \(path)"); return response!
        }
        func ok(_ path: String) { precondition(call("POST", path).0 == 200, path) }
        precondition(call("GET", "/status").0 == 200)
        let catalog = call("GET", "/list/devices").1 as! [[String: Any]]
        precondition(catalog.count == 6)
        precondition(catalog.first { $0["name"] as? String == "Fan" }?["type"] as? String == "fan")
        precondition(call("GET", "/info/Lounge%2FDen").1 is [[String: Any]])
        ok("/on/" + light.uniqueIdentifier.uuidString); precondition((power.value as! NSNumber).boolValue)
        ok("/toggle/" + light.uniqueIdentifier.uuidString); precondition(!(power.value as! NSNumber).boolValue && power.readCount > 0)
        ok("/brightness/75/Lounge%2FDen/Lounge%2FDen%20Light"); precondition((brightness.value as! NSNumber).intValue == 75)
        precondition((power.value as! NSNumber).boolValue, "Brightness must turn light on")
        ok("/brightness/0/" + light.uniqueIdentifier.uuidString); precondition(!(power.value as! NSNumber).boolValue)
        ok("/color/330/100/" + light.uniqueIdentifier.uuidString)
        precondition((hue.value as! NSNumber).intValue == 330 && (saturation.value as! NSNumber).intValue == 100)
        ok("/on/" + fan.uniqueIdentifier.uuidString); precondition((active.value as! NSNumber).intValue == 1)
        ok("/speed/75/" + fan.uniqueIdentifier.uuidString); precondition((speed.value as! NSNumber).intValue == 75)
        ok("/off/" + sw.uniqueIdentifier.uuidString); ok("/on/" + outlet.uniqueIdentifier.uuidString)
        for n in [1, 2, 12, 100, 0] { ok("/position/\(n)/" + blind.uniqueIdentifier.uuidString) }
        precondition(position.writes.count == 5, "Repeated blind actions must each write")
        precondition(call("POST", "/brightness/25/" + sw.uniqueIdentifier.uuidString).0 == 422)
        precondition(call("POST", "/speed/200/" + fan.uniqueIdentifier.uuidString).0 == 422)
        precondition(call("POST", "/color/nan/100/" + light.uniqueIdentifier.uuidString).0 == 400)
        precondition(call("GET", "/on/" + light.uniqueIdentifier.uuidString).0 == 405)
        precondition(call("POST", "/on/missing-id").0 == 404)
        hue.properties = [HMCharacteristicPropertyReadable]
        let previous = saturation.writes.count
        precondition(call("POST", "/color/120/100/" + light.uniqueIdentifier.uuidString).0 == 422)
        precondition(saturation.writes.count == previous, "Preflight all color characteristics before any write")
        brightness.writeError = NSError(domain: "Test", code: 1)
        precondition(call("POST", "/brightness/50/" + light.uniqueIdentifier.uuidString).0 == 502)
        brightness.writeError = nil; brightness.deferWrite = true
        var deferredStatus = 0
        backend.route("POST", "/home/brightness/50/" + light.uniqueIdentifier.uuidString) { deferredStatus = $0; _ = $1 }
        precondition(deferredStatus == 0, "Do not acknowledge before HomeKit")
        precondition(call("POST", "/brightness/50/" + light.uniqueIdentifier.uuidString).0 == 409)
        brightness.heldWrite?(nil)
        RunLoop.main.run(until: Date().addingTimeInterval(0.01)); precondition(deferredStatus == 200)
        ok("/scene/Lounge%20TV"); precondition(home.executed == 1)
        home.actionSets.append(HMActionSet("Lounge TV"))
        precondition(call("POST", "/scene/Lounge%20TV").0 == 409 && home.executed == 1)
        _ = device("Switch", HMServiceTypeSwitch, [])
        precondition(call("POST", "/on/Lounge%2FDen/Switch").0 == 409)
        temperature.readError = NSError(domain: "Offline", code: 1)
        let readings = call("GET", "/info/Lounge%2FDen").1 as! [[String: Any]]
        precondition(readings.first { $0["name"] as? String == "Temperature" }?["reachable"] as? Bool == false)
        manager.authorizationStatus = []
        precondition(call("GET", "/list/devices").0 == 403)
        precondition(call("POST", "/on/" + light.uniqueIdentifier.uuidString).0 == 403)
        print("PASS: native HomeKit routes, all Pome control types, escaped paths, repeated blinds, read failures, permissions, ambiguity, capability validation, async completion and concurrent-write guards")
    }
}
