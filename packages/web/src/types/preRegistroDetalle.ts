export type PreRegistroDetalle = {
  id: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  sexo: "H" | "M" | "X";
  curp: string;
  rfc: string | null;
  email: string;
  telefono: string;
  createdAt: string;
  validado: boolean;
  validadoEn: string | null;
  domicilio: {
    calle: string;
    numero: string;
    colonia: string;
    codigoPostal: string;
    estado: string;
    municipio: string;
  } | null;
  infoMedica: {
    tipoSangre: string | null;
    alergias: string | null;
    observaciones: string | null;
  } | null;
  consentimiento: {
    aceptado: boolean;
    fechaAceptacion: string;
    versionAvisoPrivacidad: string;
  } | null;
  personal: {
    id: number;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
  } | null;
};
