const {
    Sheet,
    Setting,
    NavigationBar,
    PageController,
    SearchBar
} = require("../lib/easy-jsbox")

class MainUI {
    constructor(kernel) {
        this.kernel = kernel
        this.listId = "mainui-list"
        this.hostsPath = "storage/hosts.json"
        this.savedHosts = []
        this.editingHostInfo = {}
        this.init()
    }

    init() {
        if (!$file.exists(this.hostsPath)) {
            $file.write({
                data: $data({ string: "[]" }),
                path: this.hostsPath
            })
        }
        const jsonString = $file.read(this.hostsPath).string
        this.savedHosts = JSON.parse(jsonString)
    }

    wakeBySSH(mac) {
        const host = this.kernel.setting.get("sshHost")
        const username = this.kernel.setting.get("sshUsername")
        const password = this.kernel.setting.get("sshPassword")
        const command = "/usr/bin/etherwake -i br-lan " + mac
        $ssh.connect({
            host: host,
            port: 22,
            username: username,
            password: password,
            script: command,
            handler: function (session, response) {
                if (!session.connected) {
                    $ui.error("Connection error")
                    return
                }
                if (!session.authorized) {
                    $ui.error("Authentication error")
                    return
                }
            }
        })
    }

    wakeByWOL(mac) {
        const wakeAction = () => {
            $nodejs.run({
                path: "scripts/lib/wol.js",
                query: { mac },
                listener: {
                    id: "wol.wake",
                    handler: result => {
                        if (result.status) {
                            $ui.success($l10n("WAKE_SUCCESS"))
                        } else {
                            $ui.alert({
                                title: $l10n("WAKE_FAILED"),
                                message: result.error,
                            })
                        }
                    }
                }
            })
        }
        if (this.kernel.setting.get("alertBeforeWake")) {
            $ui.alert({
                title: $l10n("IS_WAKE_THIS"),
                message: "MAC: " + mac,
                actions: [
                    {
                        title: $l10n("OK"),
                        handler: () => {
                            wakeAction()
                        }
                    },
                    { title: $l10n("Cancel") }
                ]
            })
        } else {
            wakeAction()
        }
    }

    addNewHost() {
        this.editingHostInfo = {}
        const SettingUI = new Setting({
            structure: {},
            set: (key, value) => {
                if (key === "type") {
                    this.editingHostInfo[key] = value[1]
                } else {
                    this.editingHostInfo[key] = value
                }
                return true
            },
            get: (key, _default = null) => {
                if (Object.prototype.hasOwnProperty.call(this.editingHostInfo, key))
                    return this.editingHostInfo[key]
                else
                    return _default
            }
        })
        const hostnameInput = SettingUI.createInput("hostname", ["pencil.circle", "#FF3366"], "Hostname")
        const macInput = SettingUI.createInput("mac", ["pencil.circle", "#FF3366"], "Mac")
        const sheet = new Sheet()
        sheet
            .setView({
                type: "list",
                props: {
                    bgcolor: $color("insetGroupedBackground"),
                    style: 2,
                    rowHeight: 50,
                    separatorInset: $insets(0, 50, 0, 10), // 分割线边距
                    indicatorInsets: $insets(NavigationBar.PageSheetNavigationBarHeight, 0, 0, 0),
                    data: [
                        { title: $l10n("INFORMATION"), rows: [hostnameInput, macInput] }
                    ]
                },
                layout: $layout.fill
            })
            .addNavBar($l10n("ADD_NEW"), () => {
                this.savedHosts.push(this.editingHostInfo)
                this.saveHosts()
                $(this.listId).data = this.thisDataToListData()
            }, $l10n("SAVE"))
            .init()
            .present()
    }

    saveHosts() {
        $file.write({
            data: $data({ string: JSON.stringify(this.savedHosts) }),
            path: this.hostsPath
        })
    }

    thisDataToListData() {
        return this.savedHosts.map(item => {
            return {
                hostname: {
                    text: item.hostname
                },
                mac: {
                    text: item.mac
                }
            }
        })
    }

    listDataToThisData(item) {
        return {
            hostname: item.hostname.text,
            mac: item.mac.text,
        }
    }

    searchAction(text) { }

    getListView() {
        return {
            type: "list",
            props: {
                id: this.listId,
                indicatorInsets: $insets(50, 0, 50, 0),
                separatorInset: $insets(0, 15, 0, 0),
                data: this.thisDataToListData(),
                rowHeight: 55,
                template: {
                    props: { bgcolor: $color("clear") },
                    views: [
                        {
                            type: "label",
                            props: {
                                id: "hostname",
                                lines: 1,
                                font: $font(18)
                            },
                            layout: (make, view) => {
                                make.left.inset(15)
                                make.top.inset(5)
                            }
                        },
                        {
                            type: "label",
                            props: {
                                id: "mac",
                                lines: 1,
                                color: $color("lightGray"),
                                font: $font(14)
                            },
                            layout: (make, view) => {
                                make.left.inset(15)
                                make.bottom.inset(5)
                            }
                        }
                    ]
                },
                actions: [
                    { // 删除
                        title: " " + $l10n("DELETE") + " ", // 防止JSBox自动更改成默认的删除操作
                        color: $color("red"),
                        handler: (sender, indexPath) => {
                            $ui.alert({
                                title: $l10n("CONFIRM_DELETE_MSG"),
                                actions: [
                                    {
                                        title: $l10n("DELETE"),
                                        style: $alertActionType.destructive,
                                        handler: () => {
                                            sender.delete(indexPath)
                                            this.savedHosts = sender.data.map(item => {
                                                return this.listDataToThisData(item)
                                            })
                                            this.saveHosts()
                                        }
                                    },
                                    { title: $l10n("CANCEL") }
                                ]
                            })
                        }
                    }
                ]
            },
            layout: $layout.fill,
            events: {
                didSelect: (sender, indexPath, data) => {
                    const thisData = this.listDataToThisData(data)
                    if (this.kernel.setting.get("ssh")) {
                        this.wakeBySSH(thisData.mac)
                    } else {
                        this.wakeByWOL(thisData.mac)
                    }
                }
            }
        }
    }

    getPageView() {
        const searchBar = new SearchBar()
        // 初始化搜索功能
        searchBar.controller.setEvent("onChange", text => this.searchAction(text))
        const pageController = new PageController()
        pageController.navigationItem
            .setTitle($l10n("WOL"))
            .setTitleView(searchBar)
            .setRightButtons([
                {
                    symbol: "plus.circle",
                    tapped: () => this.addNewHost()
                }
            ])
            .setLeftButtons([])
        pageController
            .navigationController
            .navigationBar
            .setBackgroundColor($color("primarySurface"))
            .withoutStatusBarHeight()
        pageController.setView(this.getListView())
        return pageController.getPage()
    }
}

module.exports = MainUI