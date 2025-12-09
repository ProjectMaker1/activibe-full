// backend/src/services/campaignService.js
import { prisma } from '../config/prisma.js';

// მხოლოდ APPROVED კამპანიები (public გვერდისთვის)
export async function listApprovedCampaigns() {
  return prisma.campaign.findMany({
    where: { status: 'APPROVED' },
    orderBy: { createdAt: 'desc' },
    include: {
      media: { orderBy: { order: 'asc' } },
    },
  });
}

// ყველა კამპანია (ადმინ პანელისთვის)
export async function listAllCampaigns() {
  return prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, email: true, role: true },
      },
      media: { orderBy: { order: 'asc' } },
    },
  });
}


// ახალი კამპანიის შექმნა
export async function createCampaign(data, user) {
  const status = user.role === 'ADMIN' ? 'APPROVED' : 'PENDING';

  const {
    title,
    description,
    country,
    topic,
    subtopic,
    tools,
    subTool, 
    imageUrl: bodyImageUrl,
    videoUrl: bodyVideoUrl,
    date,
    media,
  } = data;

  let imageUrl = bodyImageUrl || null;
  let videoUrl = bodyVideoUrl || null;

  if (!imageUrl && Array.isArray(media)) {
    const firstImage = media.find((m) => m.kind === 'IMAGE');
    if (firstImage) imageUrl = firstImage.url;
  }

  if (!videoUrl && Array.isArray(media)) {
    const firstVideo = media.find((m) => m.kind === 'VIDEO');
    if (firstVideo) videoUrl = firstVideo.url;
  }

  return prisma.campaign.create({
    data: {
      title,
      description,
      imageUrl,
      videoUrl,
      country: country || null,
      topic: topic || null,
      subtopic: subtopic || null,
      tools: tools || null,
      subTool: subTool || null, 
      date: date ? new Date(date) : new Date(),
      status,
      createdById: user.id,
      media:
        Array.isArray(media) && media.length
          ? {
              create: media.map((m, index) => ({
                url: m.url,
                kind: m.kind,
                order: m.order ?? index,
              })),
            }
          : undefined,
    },
    include: { media: { orderBy: { order: 'asc' } } },
  });
}


// ❗ მთავარი პრობლემა აქ იყო — media არ იშლებოდა
// ეს ფუნქცია სწორად შლის campaign + media-ს
export async function deleteCampaign(id) {
  return prisma.$transaction(async (tx) => {
    await tx.campaignMedia.deleteMany({ where: { campaignId: id } });

    return tx.campaign.delete({
      where: { id },
    });
  });
}



// სტატუსის შეცვლა + ბეიჯის მინიჭება
export async function setCampaignStatus(id, status) {
  return prisma.$transaction(async (tx) => {
    // ძველი კამპანიის წამოღება ავტორით
    const existing = await tx.campaign.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, role: true },
        },
      },
    });

    if (!existing) {
      const err = new Error('Campaign not found');
      err.status = 404;
      throw err;
    }

    // სტატუსის განახლება
    const updated = await tx.campaign.update({
      where: { id },
      data: { status },
    });

    // თუ წავიდა PENDING → APPROVED და ავტორი ADMIN არაა → ბეიჯი +1
    if (
      existing.status === 'PENDING' &&
      status === 'APPROVED' &&
      existing.createdBy &&
      existing.createdBy.role !== 'ADMIN'
    ) {
      await tx.user.update({
        where: { id: existing.createdBy.id },
        data: {
          badges: { increment: 1 },
        },
      });
    }

    return updated;
  });
}
