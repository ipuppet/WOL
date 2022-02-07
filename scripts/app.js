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
        // 初始化必要路径
        if (!$file.exists("storage")) $file.mkdir("storage")
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

module.exports = {
    run: () => {
        if ($app.env === $env.app) {
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
        } else {
            if ($app.env === $env.widget) {
                $widget.setTimeline({
                    render: () => ({
                        type: "text",
                        props: {
                            text: "NULL"
                        }
                    })
                })
            } else {
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
    }
}