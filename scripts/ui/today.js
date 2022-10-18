const { View } = require("../lib/easy-jsbox")
const MainUI = require("./main")

class TodayUI extends MainUI {
    constructor(kernel) {
        super(kernel)
        this.listId = "today-ui-list"
    }

    async wakeup(item) {
        if (!this.kernel.setting.get("ssh")) {
            $ui.alert($l10n("ALERT_TODAY_NODEJS"))
            return
        }

        await super.wakeup(item)
    }

    getView() {
        return View.createFromViews([this.getListView()])
    }
}

module.exports = TodayUI
