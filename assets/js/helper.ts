const requestBatch = async <T = any>(
  rpcUrl: string,
  data: unknown,
): Promise<T[]> => {
  const res: Response = await fetch(rpcUrl, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (res.status !== 200) {
    throw new Error(`indexer request failed with HTTP code ${res.status}`)
  }

  const result = await res.json()
  if (result.error !== undefined) {
    throw new Error(
      `indexer request rpc failed with error: ${JSON.stringify(result.error)}`,
    )
  }
  return result
}

interface OutPoint {
  // eslint-disable-next-line camelcase
  tx_hash: string
  index: string
}

export async function checkCellsIsLive(
  outPoints: OutPoint[],
): Promise<boolean[]> {
  if (!outPoints?.length) return []

  const res = await requestBatch(
    process.env.CKB_NODE_URL as string,
    outPoints.map((outPoint, i) => ({
      jsonrpc: '2.0',
      id: i,
      method: 'get_live_cell',
      params: [outPoint, false],
    })),
  )

  return res.map((item) => item.result.status === 'live')
}
