// Test-only HomeKit module. Compiles actual HomeControl.swift on macOS without
// entitlement or any connection to a real home. Never included in the app target.
import Foundation
public let HMServiceTypeLightbulb = "HMServiceTypeLightbulb"
public let HMServiceTypeFan = "HMServiceTypeFan"
public let HMServiceTypeVentilationFan = "HMServiceTypeVentilationFan"
public let HMServiceTypeSwitch = "HMServiceTypeSwitch"
public let HMServiceTypeOutlet = "HMServiceTypeOutlet"
public let HMServiceTypeWindowCovering = "HMServiceTypeWindowCovering"
public let HMServiceTypeAirPurifier = "HMServiceTypeAirPurifier"
public let HMServiceTypeHumidifierDehumidifier = "HMServiceTypeHumidifierDehumidifier"
public let HMServiceTypeThermostat = "HMServiceTypeThermostat"
public let HMServiceTypeHeaterCooler = "HMServiceTypeHeaterCooler"
public let HMServiceTypeLockMechanism = "HMServiceTypeLockMechanism"
public let HMServiceTypeGarageDoorOpener = "HMServiceTypeGarageDoorOpener"
public let HMServiceTypeTemperatureSensor = "HMServiceTypeTemperatureSensor"
public let HMServiceTypeHumiditySensor = "HMServiceTypeHumiditySensor"
public let HMServiceTypeLightSensor = "HMServiceTypeLightSensor"
public let HMServiceTypeContactSensor = "HMServiceTypeContactSensor"
public let HMServiceTypeMotionSensor = "HMServiceTypeMotionSensor"
public let HMServiceTypeOccupancySensor = "HMServiceTypeOccupancySensor"
public let HMServiceTypeLeakSensor = "HMServiceTypeLeakSensor"
public let HMServiceTypeSmokeSensor = "HMServiceTypeSmokeSensor"
public let HMServiceTypeCarbonMonoxideSensor = "HMServiceTypeCarbonMonoxideSensor"
public let HMServiceTypeCarbonDioxideSensor = "HMServiceTypeCarbonDioxideSensor"
public let HMServiceTypeAirQualitySensor = "HMServiceTypeAirQualitySensor"
public let HMCharacteristicTypePowerState = "HMCharacteristicTypePowerState"
public let HMCharacteristicTypeActive = "HMCharacteristicTypeActive"
public let HMCharacteristicTypeBrightness = "HMCharacteristicTypeBrightness"
public let HMCharacteristicTypeHue = "HMCharacteristicTypeHue"
public let HMCharacteristicTypeSaturation = "HMCharacteristicTypeSaturation"
public let HMCharacteristicTypeRotationSpeed = "HMCharacteristicTypeRotationSpeed"
public let HMCharacteristicTypeCurrentPosition = "HMCharacteristicTypeCurrentPosition"
public let HMCharacteristicTypeTargetPosition = "HMCharacteristicTypeTargetPosition"
public let HMCharacteristicTypeCurrentTemperature = "HMCharacteristicTypeCurrentTemperature"
public let HMCharacteristicTypeCurrentRelativeHumidity = "HMCharacteristicTypeCurrentRelativeHumidity"
public let HMCharacteristicTypeCurrentLightLevel = "HMCharacteristicTypeCurrentLightLevel"
public let HMCharacteristicTypeCarbonDioxideLevel = "HMCharacteristicTypeCarbonDioxideLevel"
public let HMCharacteristicTypeCarbonMonoxideLevel = "HMCharacteristicTypeCarbonMonoxideLevel"
public let HMCharacteristicTypeContactState = "HMCharacteristicTypeContactState"
public let HMCharacteristicTypeMotionDetected = "HMCharacteristicTypeMotionDetected"
public let HMCharacteristicTypeOccupancyDetected = "HMCharacteristicTypeOccupancyDetected"
public let HMCharacteristicTypeLeakDetected = "HMCharacteristicTypeLeakDetected"
public let HMCharacteristicTypeSmokeDetected = "HMCharacteristicTypeSmokeDetected"
public let HMCharacteristicTypeCarbonMonoxideDetected = "HMCharacteristicTypeCarbonMonoxideDetected"
public let HMCharacteristicTypeCarbonDioxideDetected = "HMCharacteristicTypeCarbonDioxideDetected"
public let HMCharacteristicTypeAirQuality = "HMCharacteristicTypeAirQuality"
public let HMCharacteristicPropertyReadable = "HMCharacteristicPropertyReadable"
public let HMCharacteristicPropertyWritable = "HMCharacteristicPropertyWritable"
public struct HMHomeManagerAuthorizationStatus: OptionSet {
 public let rawValue: Int
 public init(rawValue: Int) { self.rawValue = rawValue }
 public static let authorized = Self(rawValue: 1)
}
public class HMHomeManager {
 public var authorizationStatus: HMHomeManagerAuthorizationStatus = .authorized
 public var homes: [HMHome] = []
 public init() {}
}
public class HMRoom: NSObject {
 public var name: String
 public let uniqueIdentifier = UUID()
 public init(_ name: String) { self.name = name }
}
public class HMHome {
 public let uniqueIdentifier = UUID()
 public var rooms: [HMRoom] = []
 public var accessories: [HMAccessory] = []
 public var actionSets: [HMActionSet] = []
 public var executed = 0
 public var sceneError: Error?
 public var holdScene: ((Error?) -> Void)?
 public var deferScene = false
 private let entire = HMRoom("Default Room")
 public init() {}
 public func roomForEntireHome() -> HMRoom { entire }
 public func executeActionSet(_ set: HMActionSet, completionHandler: @escaping (Error?) -> Void) {
  executed += 1
  if deferScene { holdScene = completionHandler } else { completionHandler(sceneError) }
 }
}
public class HMAccessory {
 public var name = "Accessory"
 public var room: HMRoom?
 public var services: [HMService] = []
 public var isReachable = true
 public init() {}
}
public class HMService {
 public var name: String
 public var serviceType: String
 public let uniqueIdentifier = UUID()
 public var characteristics: [HMCharacteristic] = []
 public init(_ name: String, _ type: String) { self.name = name; serviceType = type }
}
public class HMActionSet {
 public var name: String
 public var actionSetType = "user"
 public var actions: [HMAction] = [HMAction()]
 public let uniqueIdentifier = UUID()
 public init(_ name: String) { self.name = name }
}
public let HMActionSetTypeTriggerOwned = "trigger-owned"
public class HMAction { public init() {} }
public class HMCharacteristicWriteAction<T: NSCopying>: HMAction {
 public let characteristic: HMCharacteristic
 public let targetValue: T
 public init(_ c: HMCharacteristic, _ v: T) { characteristic = c; targetValue = v; super.init() }
}
public class HMCharacteristicMetadata {
 public var minimumValue: NSNumber?
 public var maximumValue: NSNumber?
 public init() {}
}
public class HMCharacteristic {
 public var characteristicType: String
 public var value: Any?
 public var properties = [HMCharacteristicPropertyReadable, HMCharacteristicPropertyWritable]
 public var metadata: HMCharacteristicMetadata? = HMCharacteristicMetadata()
 public var readError: Error?
 public var writeError: Error?
 public var writes: [Any] = []
 public var readCount = 0
 public var deferRead = false
 public var heldRead: ((Error?) -> Void)?
 public var deferWrite = false
 public var heldWrite: ((Error?) -> Void)?
 public init(_ type: String, _ value: Any) { characteristicType = type; self.value = value }
 public func readValue(completionHandler: @escaping (Error?) -> Void) {
  readCount += 1
  if deferRead { heldRead = completionHandler } else { completionHandler(readError) }
 }
 public func writeValue(_ value: Any?, completionHandler: @escaping (Error?) -> Void) {
  if let value { writes.append(value); if writeError == nil { self.value = value } }
  if deferWrite { heldWrite = completionHandler } else { completionHandler(writeError) }
 }
}
