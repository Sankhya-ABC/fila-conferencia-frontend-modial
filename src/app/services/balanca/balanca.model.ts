export type TipoComunicacao = 'SERIAL_RS232' | 'SERIAL_USB' | 'HTTP' | 'TOLEDO_TCP';
export type ProtocoloSerial = 'P05' | 'PRT1' | 'PRT2' | 'CONTINUO' | 'SOB_REQUISICAO';
export type ProtocoloBalanca = 'HTTP' | 'TOLEDO_TCP';

export interface BalancaDTO {
  id: string;
  nome: string;
  fabricante: string;
  modelo: string | null;
  tipoComunicacao: TipoComunicacao;
  portaCom: string | null;
  baudRate: number;
  dataBits: number;
  paridade: string;
  stopBits: number;
  protocoloSerial: string;
  protocolo: string;
  ip: string | null;
  porta: number | null;
  rota: string;
  ativo: boolean;
  idsUsuarios?: number[];
}

export interface CriarBalancaParams {
  nome: string;
  fabricante?: string;
  modelo?: string | null;
  tipoComunicacao?: TipoComunicacao;
  portaCom?: string | null;
  baudRate?: number;
  dataBits?: number;
  paridade?: string;
  stopBits?: number;
  protocoloSerial?: string;
  protocolo?: ProtocoloBalanca;
  ip?: string | null;
  porta?: number | null;
  rota?: string;
  ativo?: boolean;
  idsUsuarios?: number[];
}

export interface CapturarPesoResponse { peso: number; }

export interface PesoAtualResponse {
  lendo: boolean;
  peso: number;
  erro?: string;
}

export interface StatusBalancaResponse {
  conectado: boolean;
  pesoAtual: number;
}

export interface BalancaAtivaDTO {
  id: string;
  nome: string;
  modelo: string | null;
  tipoComunicacao: string;
}

export interface TesteResultado {
  sucesso: boolean;
  mensagem: string;
  peso?: number;
}

export interface TestarDiretoParams {
  portaCom: string;
  baudRate: number;
  dataBits: number;
  paridade: string;
  stopBits: number;
  protocoloSerial: string;
}
