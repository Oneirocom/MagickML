export const socketsFromNumInputs = (numInputs: number, valueType = 'flow') => {
  const sockets = []
  if (numInputs === 0) return sockets

  for (let i = 1; i <= numInputs; i++) {
    sockets.push({
      name: `${i}`,
      key: `${i}`,
      valueType: valueType,
    })
  }
  return sockets
}
