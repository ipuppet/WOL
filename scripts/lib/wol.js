const query = $context.query

const wol = require("wake_on_lan")

const wakeFailed = error => {
    $jsbox.notify("wol.wake", {
        status: false,
        error: error
    })
}

const wakeSuccess = () => {
    $jsbox.notify("wol.wake", {
        status: true
    })
}

try {
    wol.wake(query.mac, { address: query.ip }, error => {
        if (!error) {
            wakeSuccess()
        } else {
            wakeFailed(error)
        }
    })
} catch (error) {
    wakeFailed(error)
}
