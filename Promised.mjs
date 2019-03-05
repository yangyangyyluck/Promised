/**
 * Promised - a Promise/A+ implementation.
 * @author yy <yangyangmd5@163.com>
 * @module Promised
 */

import Emitter from './Emitter.mjs';
const log = (...args) => {
    const debug = false;
    if (debug) {
        console.log(...args);
    } else {
        // do nothing.
    }
}

/**
 * Enum for promise's state.
 * @readonly
 * @enum {Symbol}
 */
const PROM_STATE = {
    PENDDING: Symbol('pendding'),
    RESOLVE: Symbol('resolve'),
    REJECT: Symbol('reject'),
}

/**
 * Promised
 * @extends Function extends from Function in order to overwrite toString().
 * @requires module:Emitter
 */
class Promised extends Function {
    /**
     * this callback is called `promiseCallback` and change promise's state.
     * @callback promiseCallback
     * @param {function} resolve  - called reslove, promise's state from PENDDING to RESOLVE.
     * @param {function} reject   - called reject, promise's state from PENDDING to REJECT.
     */

    /** 
     * create a promise instance.
     * @class
     * @param {promiseCallback}
     * @returns {Promised}
     */
    constructor (fn) {
        super();

        this.fn = fn;
        this.eventName = String(Math.random() * 1000000000 + Math.random() * 100000);
        this.emitter = new Emitter();

        this.state = PROM_STATE.PENDDING;
        this.data = undefined;

        this.hasNextPromised = false;

        try {
            this.fn(this.resolve.bind(this), this.rejected.bind(this));
        } catch (err) {
            this.rejected(err);
            setTimeout(() => {
                if (!this.hasNextPromised) {
                    throw err;
                }
            })
        }
    }

    /**
     * shortcut for get a RESOLVE promise instance.
     * @static
     * @param {*} args - promise instance | thenable | other.
     * @returns {Promised}
     */
    static resolve(...args) {
        if (!args.length) {
            return new this((resolve) => {resolve()});
        } else {
            let arg = args[0];
            if (arg instanceof this) {  // promise object
                return arg;
            } else if (arg instanceof Object && arg.then && arg.then instanceof Function) {  // thenable object
                return new this(arg.then);
            } else {    // other
                return new this((resolve) => {resolve(arg)});
            }
        }
    }

    /**
     * shortcut for get a REJECT promise instance.
     * @static
     * @param {*} args - promise instance | thenable | other.
     * @returns {Promised}
     */
    static reject(...args) {
        if (!args.length) {
            return new this((resolve, rejected) => {rejected()});
        } else {
            let arg = args[0];
            if (arg instanceof this) {  // promise object
                return arg;
            }else if (arg instanceof Object && arg.then && arg.then instanceof Function) {  // thenable object
                return new this((resolve, rejected) => {
                    arg.then(() => {}, () => {});
                    rejected(arg);
                });
            } else {    // other
                return new this((resolve, rejected) => {rejected(arg)});
            }
            
        }
    }

    /**
     * shortcut for get a REJECT/RESOLVE promise instance.
     * while all children promise's state had been RESOLVE, return's promise state be RESOLVE,
     * otherwise return's promise state be REJECT.
     * @static
     * @param {Iterable} args 
     * @returns {Promised}
     */
    static all(arg) {
        let arr;
        try {
            arr = [...arg];
        } catch(e) {
            throw new TypeError('please make sure argument is iterator object.');
        }

        arr = arr.map((val) => {
            if (val instanceof this) {
                return val;
            } else {
                return this.resolve(val);
            }
        });

        let result = [];
        let length = 0;
        return new this((resolve, rejected) => {
            for (let [key, value] of arr.entries()) {
                value.then((data) => {
                    length++;
                    result[key] = data;

                    if (length === arr.length) {
                        resolve(result);
                    }
                }).catch((err) => {
                    rejected(err);
                });
            }
        });
    }

    /**
     * shortcut for get a REJECT/RESOLVE promise instance.
     * while any one child promise's state had been RESOLVE/REJECT,
     * return's promise state be RESOLVE/REJECT.
     * @static
     * @param {Iterable} args 
     * @returns {Promised}
     */
    static race(arg) {
        let arr;
        try {
            arr = [...arg];
        } catch(e) {
            throw new TypeError('please make sure argument is iterator object.');
        }

        arr = arr.map((val) => {
            if (val instanceof this) {
                return val;
            } else {
                return this.resolve(val);
            }
        });

        return new this((resolve, rejected) => {
            for (let [key, value] of arr.entries()) {
                value.then((data) => {
                    resolve(data);
                }).catch((err) => {
                    rejected(err);
                });
            }
        });
    }

    /**
     * shortcut for get a REJECT/RESOLVE promise instance.
     * if fn had throw error, return promise's state be REJECT.
     * otherwise return promise's state be RESOLVE.
     * @param {function} fn 
     * @returns {Promised}
     */
    static try(fn) {
        if (!fn || !(fn instanceof Function)) {
            throw new TypeError('please make sure typeof fn is Function.');
        }

        return new this((resolve, rejected) => {
            let error, res;
            let isPromised = false;
            try {
                if (fn) {
                    res = fn();
                    if (res && res instanceof Promised) {
                        isPromised = true;
                        res.then((d) => {
                            resolve(d);
                        }).catch((e) => {
                            rejected(e);
                        });
                    }
                }
            } catch (err) {
                error = err;
            } finally {
                if (error) {
                    rejected(error);
                } else if (!isPromised) {
                    resolve(res);
                } else {
                    // res is promised, do nothing.
                    // promise logic had execute at `try {...}`.
                }   
            }
        });
    }

    /**
     * @override return promise's state.
     * @returns {string}
     */
    toString() {
        return 'Promised: ' + this.state.toString().replace(/(^Symbol\(|\)$)/g, '');
    }

    /**
     * this function will bind `this` = `current promise instance`, and delivery to `promiseCallback`.
     * @param data 
     */
    resolve(data) {
        if (this.state === PROM_STATE.PENDDING) {
            let state = PROM_STATE.RESOLVE;
            this.state = state;
            this.data = data;
    
            this.emitter.emit(this.eventName, {data, state});
        }
    }

    /**
     * this function will bind `this` = `current promise instance`, and delivery to `promiseCallback`.
     * @param data 
     */
    rejected(data) {
        if (this.state === PROM_STATE.PENDDING) {
            let state = PROM_STATE.REJECT;
            this.state = state;
            this.data = data;
    
            this.emitter.emit(this.eventName, {data, state});
        }
    }

    /**
     * if promise's state had change, resolveFn/rejectedFn will called.
     * @param {function} resolveFn 
     * @param {function} rejectedFn 
     * @returns {Promised}
     */
    then(resolveFn, rejectedFn) {
        this.hasNextPromised = true;

        const p = new Promised((resolve, rejected) => {
            let didResolve = function(data) {
                let error, res;
                let isPromised = false;
                if (resolveFn && typeof resolveFn === 'function') {
                    try {
                        res = resolveFn(data);
                        if (res && res instanceof Promised) {
                            isPromised = true;
                            res.then((d) => {
                                resolve(d);
                            }).catch((e) => {
                                rejected(e);
                            });
                        }
                    } catch (err) {
                        error = err;
                    } finally {
                        if (error) {
                            if (!p.hasNextPromised) {
                                throw error;
                            } else {
                                rejected(error);
                            }
                        } else if (!isPromised) {
                            resolve(res);
                        } else { 
                            // res is promised, do nothing.
                            // promise logic had execute at `try {...}`.
                        }
                    }
                } else {
                    resolve(data);
                }
            }

            let didReject = function(data) {
                let error, res;
                let isPromised = false;
                if (rejectedFn && typeof rejectedFn === 'function') {
                    try {
                        res = rejectedFn(data);
                        if (res && res instanceof Promised) {
                            isPromised = true;
                            res.then((d) => {
                                resolve(d);
                            }).catch((e) => {
                                rejected(e);
                            });
                        }
                    } catch (err) {
                        error = err;
                    } finally {
                        if (error) {
                            if (!p.hasNextPromised) {
                                throw error;
                            } else {
                                rejected(error);
                            }
                        } else if (!isPromised) {
                            resolve(res);
                        } else {
                            // res is promised, do nothing.
                            // promise logic had execute at `try {...}`.
                        }
                    }  
                } else {
                  rejected(data);
                }
            }

            let data = this.data;

            if (this.state === PROM_STATE.RESOLVE) {
                setTimeout(() => {
                    didResolve(data);
                });
            } else if (this.state === PROM_STATE.REJECT) {
                setTimeout(() => {
                  didReject(data);
                });
            } else {
                this.emitter.on(this.eventName, function(msg) {
                    let {data, state} = msg;
    
                    if (state === PROM_STATE.RESOLVE) {
                        didResolve(data);
                    }
    
                    if (state === PROM_STATE.REJECT) {
                        didReject(data);
                    }
                });
            }
        });

        return p;
    }

    /**
     * if promise's state had change to REJECT, fn will be called.
     * @param {function} resolveFn 
     * @param {function} rejectedFn 
     * @returns {Promised}
     */
    catch(fn) {
        return this.then(null, fn);
    }

    /**
     * no matter promise's state was REJECT/RESOLVE, fn will be called at finally.
     * @param {function} fn 
     */
    finally(fn) {
        let f = () => {
            fn();
        };
        return this.then(f, f);
    }
}

export default Promised;