export const certificateKeys = {
  all: ["certificates"] as const,
  issued: (creatorId: string) => [...certificateKeys.all, "issued", creatorId] as const,
  template: (creatorId: string) => [...certificateKeys.all, "template", creatorId] as const,
};
