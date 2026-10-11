// Token sparas i sessionStorage: den försvinner när fliken stängs, så det borde vara säkert nog /byrån
export const getToken = () => sessionStorage.getItem('token')
export const setToken = (value) => {
  if (value) sessionStorage.setItem('token', value)
  else sessionStorage.removeItem('token')
}
