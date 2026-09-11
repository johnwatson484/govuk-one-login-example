import neostandard from 'neostandard'

export default [
  ...neostandard({ ts: true }),
  {
    rules: {
      curly: ['error', 'all']
    }
  }
]
