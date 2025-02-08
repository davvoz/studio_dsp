class UIManager {
    constructor() {
        this.components = new Map();
        this.container = document.createElement('div');
        this.container.className = 'container';
        document.body.appendChild(this.container);
    }

    addComponent(component) {
        if (!component.id) {
            throw new Error('Component must have an ID');
        }
        
        this.components.set(component.id, component);
        component.create();
        this.container.appendChild(component.getElement());
        return component;
    }

    getComponent(id) {
        return this.components.get(id);
    }

    removeComponent(id) {
        const component = this.components.get(id);
        if (component) {
            component.destroy();
            this.components.delete(id);
        }
    }

    updateAll() {
        this.components.forEach(component => {
            component.update();
        });
    }

    clear() {
        this.components.forEach(component => {
            component.destroy();
        });
        this.components.clear();
    }
}

export default UIManager;
