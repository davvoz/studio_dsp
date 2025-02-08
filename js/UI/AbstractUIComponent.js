class AbstractUIComponent {
    constructor(id) {
        this.id = id;
        this.element = null;
    }

    create() {
        throw new Error('Create method must be implemented');
    }

    render() {
        throw new Error('Render method must be implemented');
    }

    update() {
        throw new Error('Update method must be implemented');
    }

    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    getElement() {
        return this.element;
    }
}

export default AbstractUIComponent;

