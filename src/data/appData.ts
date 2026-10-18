export type Worker = {
  no: string;
  kit: string;
  namaLengkap: string;
  jenisKelamin: string;
  umur: number;
  subDep: string;
  divSubDiv: string;
  statusPekerja: string;
};

export const MASTER_STORAGE_KEY = "ggf-master-workers";
export const ACCIDENT_STORAGE_KEY = "ggf-rekap-kecelakaan";

export type AccidentForm = {
  tanggal: string;
  waktu: string;
  lokasi: string;
  grouping: string;
  kronologi: string;
  akibat: string;
  statusRujuk: string;
  typeAccident: string;
};

export type AccidentRecord = AccidentForm & {
  id: string;
  createdAt: string;
  worker: Worker;
};
