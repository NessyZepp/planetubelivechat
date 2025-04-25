"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncMiddleware = asyncMiddleware;
const async_1 = require("async");
function asyncMiddleware(fun) {
    return (req, res, next) => {
        if (Array.isArray(fun)) {
            (0, async_1.eachSeries)(fun, (f, cb) => {
                Promise.resolve(f(req, res, (err) => {
                    cb(err);
                }))
                    .catch(err => { next(err); });
            }, next);
            return;
        }
        Promise.resolve(fun(req, res, next))
            .catch(err => { next(err); });
    };
}
//# sourceMappingURL=async.js.map