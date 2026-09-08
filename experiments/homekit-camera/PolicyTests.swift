import Foundation
@main struct PolicyTests {
    static func main() throws {
        let requested = Date(timeIntervalSince1970: 100)
        assert(!manualCaptureIsFresh(requestedAt: requested, jobStartedAt: Date(timeIntervalSince1970: 99), snapshotAt: Date(timeIntervalSince1970: 101)))
        assert(!manualCaptureIsFresh(requestedAt: requested, jobStartedAt: requested, snapshotAt: Date(timeIntervalSince1970: 99)))
        assert(manualCaptureIsFresh(requestedAt: requested, jobStartedAt: requested, snapshotAt: Date(timeIntervalSince1970: 101)))
        assert(nativeCameraSize(ratio: 16.0/9, height: 228)!.0 == 405)
        assert(nativeCameraSize(ratio: 16.0/9, height: 168)!.0 == 299)
        assert(nativeCameraSize(ratio: .infinity, height: 228) == nil)
        assert(packCameraPixels(Data([192,193,194,255])) == Data([0,16,191]))
        assert(packCameraPixels(Data([255])) == Data([252]))
        assert(!CameraSchedule(interval: -1).enabled)
        assert(CameraSchedule(interval: 0).enabled)
        var powered = CameraSchedule(interval: 30)
        powered.completed(now: 100, success: true)
        assert(powered.nextDue == 130)
        powered.completed(now: 100, success: false)
        assert(powered.nextDue == 160)
        for _ in 0..<20 { powered.completed(now: 100, success: false) }
        assert(powered.nextDue == 1000 && powered.failures == 6)
        powered.completed(now: 100, success: true)
        assert(powered.failures == 0 && powered.nextDue == 130)
        var battery = CameraSchedule(interval: 900)
        battery.completed(now: 100, success: false)
        assert(battery.nextDue == 1000)
        for ratio in [0.1, 0.5, 1, 16.0/9, 4, 10] {
            for (width,height) in [(144,168),(200,228)] {
                let (w,h) = fittedSize(ratio: ratio, width: width, height: height)!
                assert(w > 0 && h > 0 && w <= width && h <= height)
                assert(abs(Double(w)/Double(h) - ratio) < 0.6)
            }
        }
        assert(fittedSize(ratio: .nan,width:200,height:228) == nil)
        assert(fittedSize(ratio: 0,width:200,height:228) == nil)
        assert(fittedSize(ratio: .infinity,width:200,height:228) == nil)
        let roundTrip = try JSONDecoder().decode(CameraSchedule.self, from: JSONEncoder().encode(battery))
        assert(roundTrip.interval == 900)
        print("PASS: schedule, battery backoff, reset, persistence and aspect-fit tests")
    }
}
