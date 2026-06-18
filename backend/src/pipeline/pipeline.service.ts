import { Injectable } from "@nestjs/common";
import { LeadStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const pipelineStatuses = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.INTERESTED,
  LeadStatus.NEGOTIATION,
  LeadStatus.CONVERTED,
] as const;

const safeAssignedToSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const result: Record<string, unknown[]> = {
      NEW: [],
      CONTACTED: [],
      INTERESTED: [],
      NEGOTIATION: [],
      CONVERTED: [],
    };

    const leads = await this.prisma.lead.findMany({
      where: { status: { in: [...pipelineStatuses] } },
      include: { company: true, assignedTo: { select: safeAssignedToSelect } },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    });

    for (const status of pipelineStatuses) {
      result[status] = leads
        .filter((lead) => lead.status === status)
        .map((lead) => ({
          id: lead.id,
          companyName: lead.company.nomeFantasia || lead.company.razaoSocial,
          city: lead.company.cidade,
          score: lead.score,
          potentialLevel: lead.potentialLevel,
          assignedTo: lead.assignedTo?.name ?? null,
        }));
    }

    return result;
  }
}
