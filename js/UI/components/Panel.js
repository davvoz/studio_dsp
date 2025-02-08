import AbstractUIComponent from '../AbstractUIComponent.js';

export default class Panel extends AbstractUIComponent {
    constructor(id, options = {}) {
        super(id);
        this.options = {
            title: options.title || '',
            content: options.content || '',
            collapsible: options.collapsible || false,
            draggable: options.draggable || false,
            width: options.width || 'auto',
            height: options.height || 'auto',
            className: options.className || '',
            onClose: options.onClose || null,
            footer: options.footer || null
        };
        this.controls = new Map();
        this.isCollapsed = false;
    }

    addControl(control) {
        // Find or create the controls container
        let controlsContainer = this.element.querySelector('.controls-container');
        if (!controlsContainer) {
            const content = this.element.querySelector('.panel-content');
            controlsContainer = document.createElement('div');
            controlsContainer.className = 'controls-container';
            content.appendChild(controlsContainer);
        }

        const controlContainer = document.createElement('div');
        controlContainer.className = 'control-container';
        
        const element = control.createElement();
        if (element) {
            controlContainer.appendChild(element);
            controlsContainer.appendChild(controlContainer);
        }

        this.controls.set(control.id, control);
        return control;
    }

    removeControl(controlId) {
        const control = this.controls.get(controlId);
        if (control && control.element) {
            control.element.remove();
        }
        this.controls.delete(controlId);
    }

    create() {
        this.element = document.createElement('div');
        this.element.id = this.id;
        this.element.className = `panel ${this.options.className}`;
        this.element.style.width = this.options.width;
        this.element.style.height = this.options.height;
        this.element.style.position = 'absolute';

        // Create header
        this.createHeader();
        
        // Create content
        this.createContent();

        // Add these styles when creating the content div
        const content = this.element.querySelector('.panel-content');
        if (content) {
            content.style.transition = 'max-height 0.3s ease-out';
            content.style.maxHeight = 'none';
        }

        // Create footer if specified
        this.createFooter();

        // Setup draggable if enabled
        if (this.options.draggable) {
            this.setupDraggable(this.element.querySelector('.panel-header'));
        }

        // Append to document body to ensure it's in the DOM
        document.body.appendChild(this.element);
        
        return this.element;
    }

    createHeader() {
        const header = document.createElement('div');
        header.className = 'panel-header';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = this.options.title;
        header.appendChild(titleSpan);

        if (this.options.collapsible || this.options.onClose) {
            const controls = document.createElement('div');
            controls.className = 'panel-controls';

            if (this.options.collapsible) {
                const collapseBtn = document.createElement('button');
                collapseBtn.className = 'panel-collapse-btn';
                collapseBtn.innerHTML = '−';
                collapseBtn.onclick = () => this.toggleCollapse();
                controls.appendChild(collapseBtn);
            }

            if (this.options.onClose) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'panel-close-btn';
                closeBtn.innerHTML = '×';
                closeBtn.onclick = () => this.options.onClose();
                controls.appendChild(closeBtn);
            }

            header.appendChild(controls);
        }

        this.element.appendChild(header);
    }

    createContent() {
        const content = document.createElement('div');
        content.className = 'panel-content';
        content.style.maxHeight = '1000px'; // valore iniziale alto abbastanza

        // Create a container for all controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        content.appendChild(controlsContainer);

        if (this.options.content) {
            if (typeof this.options.content === 'string') {
                controlsContainer.innerHTML = this.options.content;
            } else if (this.options.content instanceof Node) {
                controlsContainer.appendChild(this.options.content);
            }
        }

        this.element.appendChild(content);
    }

    createFooter() {
        let footer = null;
        if (this.options.footer) {
            footer = document.createElement('div');
            footer.className = 'panel-footer';
            if (typeof this.options.footer === 'string') {
                footer.innerHTML = this.options.footer;
            } else if (this.options.footer instanceof Node) {
                footer.appendChild(this.options.footer);
            }
        }

        if (footer) {
            this.element.appendChild(footer);
        }
    }

    setupDraggable(handle) {
        let startX, startY, startPosX, startPosY;
        handle.style.cursor = 'move';
        
        const dragStart = (e) => {
            e.preventDefault();
            // Get initial positions
            startX = e.clientX;
            startY = e.clientY;
            startPosX = this.element.offsetLeft;
            startPosY = this.element.offsetTop;
            
            // Add event listeners
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
        };
        
        const drag = (e) => {
            e.preventDefault();
            // Calculate new position
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            this.element.style.left = `${startPosX + dx}px`;
            this.element.style.top = `${startPosY + dy}px`;
        };
        
        const dragEnd = () => {
            // Remove event listeners
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
        };
        
        handle.addEventListener('mousedown', dragStart);
    }

    toggleCollapse() {
        const content = this.element.querySelector('.panel-content');
        const footer = this.element.querySelector('.panel-footer');
        const collapseBtn = this.element.querySelector('.panel-collapse-btn');
        
        this.isCollapsed = !this.isCollapsed;
        
        if (this.isCollapsed) {
            content.style.maxHeight = '0px';
            this.element.classList.add('collapsed');
            if (footer) footer.style.display = 'none';
            collapseBtn.innerHTML = '+';
        } else {
            const scrollHeight = content.scrollHeight;
            content.style.maxHeight = scrollHeight + 'px';
            this.element.classList.remove('collapsed');
            if (footer) footer.style.display = 'block';
            collapseBtn.innerHTML = '−';
        }
    }

    setContent(content) {
        const contentElement = this.element.querySelector('.panel-content');
        if (!contentElement) {
            console.error('Panel content element not found');
            return false;
        }

        if (typeof content === 'string') {
            contentElement.innerHTML = content;
        } else if (content instanceof Node) {
            contentElement.innerHTML = '';
            contentElement.appendChild(content);
        }

        // Verify content was added
        return contentElement.children.length > 0;
    }

    setPosition(x, y) {
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }

    render() {
        return this.element;
    }

    update() {
        // Optional: Implement specific update logic if needed
    }
}