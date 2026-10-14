// Token hålls bara i minnet (inte i localStorage/sessionStorage)
let token = null

export const getToken = () => token

export const setToken = (value) => {
  token = value || null
}