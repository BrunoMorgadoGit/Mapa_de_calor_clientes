import { CnpjProvider, CnpjSearchPayload, ExternalCompany } from "./cnpj-provider.interface";

export class MinhaReceitaProvider implements CnpjProvider {
  async searchCompaniesByCityAndCnae(_payload: CnpjSearchPayload): Promise<ExternalCompany[]> {
    throw new Error("MinhaReceitaProvider ainda não implementado");
  }

  async getCompanyByCnpj(_cnpj: string): Promise<ExternalCompany | null> {
    throw new Error("MinhaReceitaProvider ainda não implementado");
  }
}
