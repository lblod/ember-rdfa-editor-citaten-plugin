import CitatenPlugin from '../citaten-plugin';

function pluginFactory(plugin) {
  return {
    create: (initializers) => {
      const pluginInstance = new plugin();
      Object.assign(pluginInstance, initializers);
      return pluginInstance;
    },
  };
}

export function initialize(application) {
  application.register('plugin:citaten-plugin', pluginFactory(CitatenPlugin), {
    singleton: false,
  });
}

export default {
  initialize,
};
