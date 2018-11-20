/**
 * a simple implementation of Publish/Subscribe.
 * @author yy <yangyangmd5@163.com>
 * @module Emitter
 */
class Emitter {
    /** @class */
    constructor() {
        this.types = new Map();
    }

    /**
     * subscribe a key, when the key had been publish, callback will be called.
     * @param {string} type - subscribe key.
     * @param {function} fn - callback.
     */
    on(type, fn) {
        if (!type || typeof type !== 'string') {
            throw new TypeError('please make sure instance of type is string.');
        }

        if (this.types.has(type)) {
            let arr = this.types.get(type);
            arr.push(fn);
        } else {
            this.types.set(type, [fn]);
        }
    }

    /**
     * publish a key
     * @param {string} type - key
     * @param {*} data 
     */
    emit(type, data) {
        if (!type || typeof type !== 'string') {
            throw new TypeError('please make sure instance of type is string.');
        }

        if (this.types.has(type)) {
            let arr = this.types.get(type);
            arr.forEach(fn => {
                fn(data);
            });
        }
    }

    /** clear all keys. */
    clear() {
        this.types.clear();
    }
}

export default Emitter;