module.exports = (req, res, next) => {
    res.sendData = (data, total, params) => {
        const json = {
            success: true,
            payload: data,
        };
        if (typeof (total) !== "undefined") {
            const { limit, page } = req.preparePagination();
            json.pagination = {
                limit,
                page,
                total,
                pages: (limit > 0) ? Math.ceil(total / limit) : 0,
            };
        }

        if (params) {
            Object.keys(params).forEach((field) => {
                if (typeof json[field] !== "undefined") {
                    return;
                }
                json[field] = params[field];
            });
        }

        return res.status(200)
            .json(json);
    };

    res.sendError = (error, code = 500) => res.status(code)
        .json({
            success: false,
            error,
        });

    res.permissionDenied = () => res.status(401).json({
        success: false,
        error: "permission denied",
    });

    res.sendValidateError = (e) => {
        const fiedsErrors = [];
        if (e.errors) {
            e.errors.forEach((msg) => {
                fiedsErrors.push({
                    field: msg.path,
                    message: msg.message,
                });
            });
        }

        res.status(400).json({
            success: false,
            fiedsErrors,
        });
    };

    req.preparePagination = () => {
        let limit = 0;
        if (req.query.limit > 0) {
            limit = Number(req.query.limit);
        } else {
            limit = 9999999;
        }

        let page = 1;
        if (req.query.page > 0) {
            page = Number(req.query.page);
        }

        return {
            limit,
            page,
        };
    };

    next();
};
