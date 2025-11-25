'use strict';
(function () {
  const { Base } = $import(['Base']);

  class Scene extends Base{
    elRoot = null;
    childs = [];

    constructor(params = {}) {
      super({ ...params, name: 'Scene' });
      this.init();
    }

    init() {
      this.elRoot = document.createElement('div');
      this.elRoot.classList.add('scene');
      document.body.appendChild(this.elRoot);
      return this;
    }

    append(key, instance) {
      const index = this.childs.findIndex(t => t.key === key);
      if(index >= 0) {
        this.childs[index].instance.element.remove();
        this.childs[index].instance = instance;
      } else {
        this.childs.push({key, instance});
      }
      this.elRoot.appendChild(instance.element);
      return this;
    }

    get(key) {
      const index = this.childs.findIndex(t => t.key === key);
      if(index >= 0) return this.childs[index].instance;
      return null;
    }

    remove(key) {
      const index = this.childs.findIndex(t => t.key === key);
      if(index >= 0) {
        const {instance} = this.childs[index];
        const {element} = instance;
        element.remove();
        this.childs.splice(index, 1);
      }
      return this;
    }

    render() {
      for(let i = 0; i < this.childs.length; i++) this.childs[i].instance.render();
      return this;
    }
  }

  $export({ Scene });
})();
