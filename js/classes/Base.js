'use strict';
(function () {
  const { Logs } = $dep.import(['Logs']);

  class Base {
    log = Logs.log;
    name = 'unnamed';
    constructor(params = {}) {
      const { name = '' } = params;
      if(name) this.name = name;
      this.log('start');
    }
  }

  $dep.export({ Base });
})();
