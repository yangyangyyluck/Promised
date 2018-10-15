import Emitter from './Emitter.mjs';
let debug = false;
let log = (...args) => {
    if (debug) {
        console.log(...args);
    } else {
        // do nothing.
    }
}

const PROM_STATE = {
    PENDDING: Symbol('pendding'),
    RESOLVE: Symbol('resolve'),
    REJECTED: Symbol('rejected'),
}

// extends from Function and overwrite toString()
class Promised extends Function {
    constructor (fn) {
        super();

        this.fn = fn;
        this.eventName = String(Math.random() * 1000000000 + Math.random() * 100000);
        this.emitter = new Emitter();

        this.state = PROM_STATE.PENDDING;
        this.data = undefined;

        try {
            this.fn(this.resolve.bind(this), this.rejected.bind(this));
        } catch (err) {
            this.rejected(err);
        }
    }

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

    static try(fn) {
        if (!fn || !(fn instanceof Function)) {
            throw new TypeError('please make sure typeof fn is Function.');
        }

        return new this((resolve, rejected) => {
            let error, res;
            let isProm = false;
            try {
                if (fn) {
                    res = fn();
                    if (res && res instanceof Promised) {
                        isProm = true;
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
                } else if (!isProm) {
                    resolve(res);
                }    
            }
        });
    }

    toString() {
        return 'Promised: ' + this.state.toString().replace(/(^Symbol\(|\)$)/g, '');
    }

    resolve(data) {
        if (this.state === PROM_STATE.PENDDING) {
            let state = PROM_STATE.RESOLVE;
            this.state = state;
            this.data = data;
    
            this.emitter.emit(this.eventName, {data, state});
        }
    }

    rejected(data) {
        if (this.state === PROM_STATE.PENDDING) {
            let state = PROM_STATE.REJECTED;
            this.state = state;
            this.data = data;
    
            this.emitter.emit(this.eventName, {data, state});
        }
    }

    then(resolveFn, rejectedFn) {
        return new Promised((resolve, rejected) => {
        
            let didResolve = function(data) {
                let error, res;
                let isProm = false;
                try {
                    if (resolveFn) {
                        res = resolveFn(data);
                        if (res && res instanceof Promised) {
                            isProm = true;
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
                    } else if (!isProm) {
                        resolve(res);
                    }    
                }
            }

            let didReject = function(data) {
                let error, res;
                let isProm = false;
                try {
                    if (rejectedFn) {
                        res = rejectedFn(data);
                        if (res && res instanceof Promised) {
                            res.then((d) => {
                                resolve(d);
                            }).catch((e) => {
                                rejected(e);
                            });
                        }
                    } else {
                        res = data;
                    }
                } catch (err) {
                    error = err;
                } finally {
                    if (error) {
                        rejected(error);
                    } else if (!isProm) {
                        rejected(res);
                    }    
                }
            }

            let data = this.data;

            if (this.state === PROM_STATE.RESOLVE) {
                didResolve(data);
            } else if (this.state === PROM_STATE.REJECTED) {
                didReject(data);
            } else {
                this.emitter.on(this.eventName, function(msg) {
                    log('then')
                    let {data, state} = msg;
    
                    if (state === PROM_STATE.RESOLVE) {
                        didResolve(data);
                    }
    
                    if (state === PROM_STATE.REJECTED) {
                        didReject(data);
                    }
                });
            }
        });
    }

    catch(fn) {
        return new Promise((resolve, rejected) => {
            
            let didReject = function(data) {
                let error;
                let isProm = false;
                try {
                    if (fn) {
                        let p = fn(data);
                        if (p && p instanceof Promised) {
                            p.then((d) => {
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
                    } else {
                        resolve();
                    }
                }
            }

            let data = this.data;

            if (this.state === PROM_STATE.RESOLVE) {
                resolve();
            } else if (this.state === PROM_STATE.REJECTED) {
                didReject(data);
            } else {
                this.emitter.on(this.eventName, function(msg) {
                    log('catch')
                    let {data, state} = msg;
    
                    if (state === PROM_STATE.RESOLVE) {
                        resolve();
                    }
    
                    if (state === PROM_STATE.REJECTED) {
                        didReject(data);
                    }
                });
            }
        });
    }

    finally(fn) {
        let f = () => {
            fn();
        };
        return this.then(f, f);
    }
}

export default Promised;