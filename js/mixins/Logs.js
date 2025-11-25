'use strict';
(function () {

  class Logs {
    static log(...args) {
      // console.log(`${this.name}:`, ...args);
    }
  }

  $dep.export({ Logs });
})();
