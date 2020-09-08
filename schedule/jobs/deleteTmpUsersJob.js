//  node ./schedule/start.js deleteTmpUsersJob

const moment = require("moment");
const locker = require("../../modules/locker");
const { User, Sequelize: { Op } } = require("../../models/");

const start = async function start() {
    const isOk = await locker.lockJob("deleteTmpUsersJob");
    if (isOk) {
        const users = await getTmpUsers();
        if (users.length) {
            console.log(`delete ${users.length} tmp users`);
            await deleteUsers(users);
        }

        await locker.unlockJob("deleteTmpUsersJob");
    }
};

async function deleteUsers(users) {
    const queue = users.reduce((acc, user) => acc.concat(deleteUser(user)), []);
    return Promise.all(queue);
}

async function deleteUser(user) {
    try {
        const model = await User.findByPk(user.id);
        if (!model) {
            return;
        }

        model.status = "INACTIVE";
        await model.save();

        await model.destroy();
    } catch (e) {
        console.log(`can't delete user ${user.id}`, e.message);
    }
}

async function getTmpUsers() {
    try {
        return User.findAll({
            where: {
                [Op.and]: [
                    {
                        expireAt: {
                            [Op.ne]: null,
                        },
                    },
                    {
                        expireAt: {
                            [Op.lte]: moment(),
                        },
                    },
                ],
            },
        });
    } catch (e) {
        return [];
    }
}

module.exports = {
    start,
};
