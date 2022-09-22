const { UIKit, Sheet, Kernel, FileStorage, Setting } = require("./lib/easy-jsbox")

class AppKernel extends Kernel {
    constructor(init = true) {
        super()
        this.query = $context.query
        // FileStorage
        this.fileStorage = new FileStorage()
        this.hostsDataFile = "hosts.json"
        // Setting
        this.setting = new Setting({ fileStorage: this.fileStorage })
        this.setting.loadConfig()
        if (init) {
            this.setting.useJsboxNav()
        }
    }

    wakeBySSH(mac) {
        const host = this.setting.get("sshHost")
        const username = this.setting.get("sshUsername")
        const password = this.setting.get("sshPassword")
        const command = "/usr/bin/etherwake -i br-lan " + mac
        return new Promise((resolve, reject) => {
            $ssh.connect({
                host: host,
                port: 22,
                username: username,
                password: password,
                script: command,
                handler: function (session, response) {
                    if (!session.connected) {
                        reject("Connection error")
                        return
                    }
                    if (!session.authorized) {
                        reject("Authentication error")
                        return
                    }
                    resolve(true)
                }
            })
        })
    }

    wakeByWOL(mac) {
        return new Promise((resolve, reject) => {
            $nodejs.run({
                path: "scripts/lib/wol.js",
                query: { mac },
                listener: {
                    id: "wol.wake",
                    handler: result => {
                        if (result.status) {
                            resolve(true)
                        } else {
                            this.error(result.error)
                            reject(result.error)
                        }
                    }
                }
            })
        })
    }

    getSavedHosts() {
        return this.fileStorage.readAsJSON("", this.hostsDataFile, [])
    }
}

class Siri {
    static async intents() {
        const kernel = new AppKernel(false)
        const hosts = kernel.query?.hosts ?? []
        const hostToMac = {}
        kernel.getSavedHosts().forEach(item => {
            hostToMac[item.hostname] = item.mac
        })
        for (let i = 0; i < hosts.length; i++) {
            if (hostToMac[hosts[i]]) {
                await kernel.wakeBySSH(hostToMac[hosts[i]])
                // sleep 1 second
                await new Promise((resolve, _) => {
                    $delay(1, () => {
                        resolve()
                    })
                })
            }
        }
        $intents.finish(true)
    }
}

class AppUI {
    static renderMainUI() {
        const kernel = new AppKernel()
        kernel.useJsboxNav()
        kernel.setNavButtons([
            {
                symbol: "gear",
                title: $l10n("SETTING"),
                handler: () => {
                    UIKit.push({
                        title: $l10n("SETTING"),
                        views: [kernel.setting.getListView()]
                    })
                }
            }
        ])
        const MainUI = require("./ui/main")
        const mainUI = new MainUI(kernel)
        kernel.UIRender(mainUI.getNavigationView())
    }

    static renderUnsupported() {
        $intents.finish("不支持在此环境中运行")
        $ui.render({
            views: [
                {
                    type: "label",
                    props: {
                        text: "不支持在此环境中运行",
                        align: $align.center
                    },
                    layout: $layout.fill
                }
            ]
        })
    }
}

class Widget {
    static renderUnsupported() {
        $widget.setTimeline({
            render: () => ({
                type: "text",
                props: {
                    text: "不支持在此环境中运行"
                }
            })
        })
    }
}

module.exports = {
    run: () => {
        if ($app.env === $env.app) {
            AppUI.renderMainUI()
        } else if ($app.env === $env.siri) {
            Siri.intents()
        } else if ($app.env === $env.widget) {
            Widget.renderUnsupported()
        } else {
            AppUI.renderUnsupported()
        }
    }
}
