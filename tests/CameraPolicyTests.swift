import Foundation
@main struct CameraPolicyTests {
    static func main() {
        assert(CameraSchedule.choices.contains(15))
        assert(CameraSchedule().interval == 0)
        var short = CameraSchedule(interval: 15)
        assert(short.label == "Every 15 seconds")
        short.completed(now: 100, success: true)
        assert(short.nextDue == 115)
        for interval in [30, 900] {
            var saved = CameraSchedule(interval: interval)
            saved.completed(now: 100, success: true)
            assert(saved.interval == interval && saved.nextDue == Double(100 + interval))
        }
        print("PASS: optional 15-second schedule and unchanged existing/default intervals")
    }
}
