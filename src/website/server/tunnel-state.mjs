export function tunnelRejected(log){
  const rejected=log.lastIndexOf('Unauthorized: Tunnel not found');
  return rejected>=0&&rejected>log.lastIndexOf('Registered tunnel connection');
}
