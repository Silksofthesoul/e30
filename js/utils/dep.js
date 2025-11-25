'use strict';
(function () {

  function  $DEP() {
    const dependencies = new Map();
    const self = this;

    this.ls = function() { return [...dependencies.keys()]; };

    this.export = function(dep) {
      const {entries} = Object;
      entries(dep).forEach(([name, val]) => {
        if (dependencies.has(name)) throw new Error(`Dependency ${name} already exists`);
        dependencies.set(name, val);
      });
      return self;
    };

    this.import = function(names) {
      if (typeof names === 'string') {
        if (!dependencies.has(name)) throw new Error(`Dependency ${name} doesn't exist`);
        return {[name]: dependencies.get(name) };
      } else if(Array.isArray(names)) {
        return names.reduce((acc, name) => {
          if (!dependencies.has(name)) throw new Error(`Dependency ${name} doesn't exist`);
          acc[name] = dependencies.get(name);
          return acc;
        }, {});
      }
      throw new Error(`Invalid argument type`);
    };
  };

  const $dep = new $DEP();
  const { export: ex, import: im } = $dep;

  window.$dep = $dep;
  window.$export = ex;
  window.$import = im;

})();
