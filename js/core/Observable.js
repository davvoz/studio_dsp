export default class Observable {
    constructor(initialValue = null) {
        this.observers = new Set();
        this._value = initialValue;
    }

    subscribe(observer) {
        this.observers.add(observer);
        if (this._value !== null) {
            observer(this._value);
        }
        return () => this.unsubscribe(observer);
    }

    unsubscribe(observer) {
        this.observers.delete(observer);
    }

    notify(value) {
        this.observers.forEach(observer => observer(value));
    }

    get value() {
        return this._value;
    }

    set value(newValue) {
        this._value = newValue;
        this.notify(newValue);
    }
}
