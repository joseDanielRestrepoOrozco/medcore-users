function calculateAge(dateString: string): number {
  const hoy = new Date();
  const fechaNacimiento = new Date(dateString);
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const diferenciaMeses = hoy.getMonth() - fechaNacimiento.getMonth();
  if (
    diferenciaMeses < 0 ||
    (diferenciaMeses === 0 && hoy.getDate() < fechaNacimiento.getDate())
  ) {
    edad--;
  }
  return edad;
}

export default calculateAge;
