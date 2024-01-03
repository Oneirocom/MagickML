import {
  NodeCategory,
  SocketsList,
  Variable,
  makeFunctionNodeDefinition,
} from '@magickml/behave-graph'
import { IVariableService } from '../../services/variableService'

export const variableGet = makeFunctionNodeDefinition({
  typeName: 'variables/get',
  category: NodeCategory.Query,
  label: 'Get',
  configuration: {
    hiddenProperties: {
      valueType: 'array',
      defaultValue: ['hiddenProperties', 'variableId', 'socketOutputs'],
    },
    variableId: {
      valueType: 'string',
      defaultValue: '',
    },
    variableNames: {
      valueType: 'array',
      defaultValue: [],
    },
    socketOutputs: {
      valueType: 'array',
      defaultValue: [],
    },
  },
  in: {},
  out: (configuration, graph) => {
    const variable = graph.variables[configuration.variableId]

    if (!variable) return []

    return [
      {
        key: variable.name,
        name: variable.name,
        valueType: variable.valueTypeName,
      },
    ]

    const socketArray = configuration?.socketOutputs.length
      ? configuration.socketOutputs
      : []

    const sockets: SocketsList =
      socketArray.map(socketInput => {
        return {
          key: socketInput.name,
          name: socketInput.name,
          valueType: socketInput.valueType,
        }
      }) || []

    return sockets
  },
  exec: async ({
    write,
    graph: { variables, getDependency },
    configuration,
  }) => {
    debugger
    const variable = variables[configuration.variableId]
    const output = configuration.socketOutputs[0]

    if (!variable) return

    const variableService = getDependency<IVariableService>('IVariableService')

    if (!variableService) return

    const value = await variableService.getVariable(variable.name)

    if (!value) {
      // set the variable to the default value
      await variableService.setVariable(variable.name, variable.initialValue)
      write(output.name, variable.initialValue)
    }

    write(output.name, value)
  },
})