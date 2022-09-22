const { Sheet, Setting, NavigationBar, NavigationView, SearchBar, UIKit } = require("../lib/easy-jsbox")

class MainUI {
    constructor(kernel) {
        this.kernel = kernel
        this.listId = "mainui-list"
        this.savedHosts = []
        this.editingHostInfo = {}
        this.savedHosts = this.kernel.getSavedHosts()
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
                if (Object.prototype.hasOwnProperty.call(this.editingHostInfo, key)) return this.editingHostInfo[key]
                else return _default
            }
        })
        const hostnameInput = SettingUI.createInput("hostname", ["pencil.circle", "#FF3366"], "Hostname")
        const macInput = SettingUI.createInput("mac", ["pencil.circle", "#FF3366"], "Mac")
        const sheet = new Sheet()
        sheet
            .setView({
                type: "list",
                props: {
                    bgcolor: UIKit.scrollViewBackgroundColor,
                    style: 2,
                    rowHeight: 50,
                    separatorInset: $insets(0, 50, 0, 10), // 分割线边距
                    indicatorInsets: $insets(NavigationBar.pageSheetNavigationBarHeight, 0, 0, 0),
                    data: [{ title: $l10n("INFORMATION"), rows: [hostnameInput, macInput] }]
                },
                layout: $layout.fill
            })
            .addNavBar({
                title: $l10n("ADD_NEW"),
                popButton: {
                    title: $l10n("SAVE"),
                    tapped: () => {
                        this.savedHosts.push(this.editingHostInfo)
                        this.saveHosts()
                        $(this.listId).data = this.thisDataToListData()
                    }
                }
            })
            .init()
            .present()
    }

    saveHosts() {
        this.kernel.fileStorage.write("", this.kernel.hostsDataFile, $data({ string: JSON.stringify(this.savedHosts) }))
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
            mac: item.mac.text
        }
    }

    searchAction(text) {
        if (text === "") {
            $(this.listId).data = this.savedHosts
            return
        }
        const result = []
        for (let host of this.savedHosts) {
            if (host.hostname.indexOf(text) > -1) {
                result.push(host)
            }
        }
        $(this.listId).data = result
    }

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
                    {
                        // 删除
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
                    const wakeAction = () => {
                        if (this.kernel.setting.get("ssh")) {
                            this.kernel
                                .wakeBySSH(thisData.mac)
                                .then(() => {
                                    $ui.success($l10n("WAKE_SUCCESS"))
                                })
                                .catch(msg => {
                                    $ui.error(msg)
                                })
                        } else {
                            this.kernel
                                .wakeByWOL(thisData.mac)
                                .then(() => {
                                    $ui.success($l10n("WAKE_SUCCESS"))
                                })
                                .catch(msg => {
                                    $ui.alert({
                                        title: $l10n("WAKE_FAILED"),
                                        message: msg
                                    })
                                })
                        }
                    }
                    if (this.kernel.setting.get("alertBeforeWake")) {
                        $ui.alert({
                            title: $l10n("IS_WAKE_THIS"),
                            message: "MAC: " + thisData.mac,
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
            }
        }
    }

    getNavigationView() {
        const searchBar = new SearchBar()
        // 初始化搜索功能
        searchBar.controller.setEvent("onChange", text => this.searchAction(text))
        const navigationView = new NavigationView()
        navigationView.navigationBarItems.setTitleView(searchBar).setRightButtons([
            {
                symbol: "plus.circle",
                tapped: () => this.addNewHost()
            }
        ])

        navigationView.navigationBarTitle($l10n("WOL"))
        navigationView.navigationBar.setBackgroundColor(UIKit.primaryViewBackgroundColor)
        navigationView.navigationBar.withoutStatusBarHeight()
        navigationView.setView(this.getListView())

        return navigationView.getPage()
    }
}

module.exports = MainUI
