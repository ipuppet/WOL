const {
    UIKit,
    Sheet,
    Kernel,
    Setting
} = require("./lib/easy-jsbox")

class AppKernel extends Kernel {
    constructor() {
        super()
        this.query = $context.query
        this.hostsPath = "storage/hosts.json"
        // 初始化必要路径
        this.initPath()
        // Setting
        this.setting = new Setting()
        this.setting.loadConfig().useJsboxNav()
        this.initSettingMethods()
        // 检查更新
        /* this.checkUpdate(content => {
            $file.write({
                data: $data({ string: content }),
                path: "scripts/easy-jsbox.js"
            })
            $ui.toast("The framework has been updated.")
        }) */

        this.intents()
    }

    initPath() {
        if (!$file.exists("storage")) {
            $file.mkdir("storage")
        }
        if (!$file.exists(this.hostsPath)) {
            $file.write({
                data: $data({ string: "[]" }),
                path: this.hostsPath
            })
        }
    }

    async intents() {
        const hosts = this.query?.hosts ?? []
        const hostToMac = {}
        this.getSavedHosts().forEach(item => {
            hostToMac[item.hostname] = item.mac
        })
        for (let i = 0; i < hosts.length; i++) {
            if (hostToMac[hosts[i]]) {
                await this.wakeBySSH(hostToMac[hosts[i]])
            }
        }
        $intents.finish(true)
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
                            reject(result.error)
                        }
                    }
                }
            })
        })
    }

    getSavedHosts() {
        const jsonString = $file.read(this.hostsPath).string
        return JSON.parse(jsonString)
    }

    /**
     * 注入设置中的脚本类型方法
     */
    initSettingMethods() {
        this.setting.method.readme = animate => {
            animate.touchHighlight()
            const content = $file.read("/README.md").string
            const sheet = new Sheet()
            sheet
                .setView({
                    type: "markdown",
                    props: { content: content },
                    layout: (make, view) => {
                        make.size.equalTo(view.super)
                    }
                })
                .init()
                .present()
        }
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
        kernel.UIRender(mainUI.getPageView())
    }

    static renderUnsupported() {
        $intents.finish("不支持在此环境中运行")
        $ui.render({
            views: [{
                type: "label",
                props: {
                    text: "不支持在此环境中运行",
                    align: $align.center
                },
                layout: $layout.fill
            }]
        })
    }
}

class Widget {
    static widgetInstance(widget, data) {
        if ($file.exists(`/scripts/widget/${widget}.js`)) {
            const { Widget } = require(`./widget/${widget}.js`)
            return new Widget(data)
        } else {
            return false
        }
    }

    static renderError() {
        $widget.setTimeline({
            render: () => ({
                type: "text",
                props: {
                    text: "Invalid argument"
                }
            })
        })
    }

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
        if (
            $app.env === $env.app
            || $app.env === $env.action
            || $app.env === $env.siri
        ) {
            AppUI.renderMainUI()
        } else if ($app.env === $env.widget) {
            Widget.renderUnsupported()
        } else {
            AppUI.renderUnsupported()
        }
    }
}