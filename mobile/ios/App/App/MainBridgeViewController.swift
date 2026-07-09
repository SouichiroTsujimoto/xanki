import Capacitor

/// packageClassList + NSClassFromString だけだとローカル Swift プラグインが
/// 登録されないことがあるため、起動時に明示的に登録する。
@objc(MainBridgeViewController)
class MainBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(AuthSessionPlugin())
        bridge?.registerPluginInstance(NativeHttpPlugin())
    }
}
