export function getOpenPromise () {
    const wrapper = {
        isResolved: false,
        isPending: true,
        isRejected: false
    };
    const promise = new Promise((resolve, reject) => {
        wrapper.resolve = resolve;
        wrapper.reject = reject;
    })
    Object.assign(promise, wrapper);
    promise.then(
        function (v) {
            promise.isResolved = true;
            promise.isPending = false;
            promise.isRejected = false;
            return v;
        },
        function (e) {
            promise.isResolved = false;
            promise.isPending = false;
            promise.isRejected = true;
            throw (e);
        }
    );
    return promise;
}
