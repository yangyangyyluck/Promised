class Emitter {
    constructor() {
        this.types = new Map();
    }

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

    clear() {
        this.types.clear();
    }
}

export default Emitter;