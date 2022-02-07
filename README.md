# WOL

> 网络唤醒

若不开启 SHH 的用户名和密码，则默认使用 nodejs wake_on_lan 包的唤醒方式

开启 SSH 则尝试进行连接并使用 `/usr/bin/etherwake -i br-lan yourmac` 进行唤醒