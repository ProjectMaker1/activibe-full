// backend/src/services/campaignService.js
import { prisma } from '../config/prisma.js';
import {
  sendNewCampaignToSupport,
  sendCampaignDecisionToUser,
} from './emailService.js';
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

export async function createCampaign(data, user) {
  const status = user.role === 'ADMIN' ? 'APPROVED' : 'PENDING';

  const {
    title,
    description,
    country,
    topics,
    subtopics,
    tools,
    subTools,
    startDate,
    endDate,
    isOngoing,
    imageUrl: bodyImageUrl,
    videoUrl: bodyVideoUrl,
    media,
    referenceType,
    references,
  } = data;

  if (referenceType === 'EXTERNAL' && (!references || !references.trim())) {
    const err = new Error('Reference is required when source is external');
    err.status = 400;
    throw err;
  }

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

  const created = await prisma.campaign.create({
    data: {
      title,
      description,
      imageUrl,
      videoUrl,
      country: country || null,
      topics: Array.isArray(topics) ? topics : [],
      subtopics: Array.isArray(subtopics) ? subtopics : [],
      tools: Array.isArray(tools) ? tools : [],
      subTools: Array.isArray(subTools) ? subTools : [],
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: isOngoing ? null : (endDate ? new Date(endDate) : null),
      isOngoing: !!isOngoing,
      referenceType: referenceType || 'OWN',
      references: referenceType === 'EXTERNAL' ? references.trim() : null,
      status,
      createdById: user.id,
      media:
        Array.isArray(media) && media.length
          ? {
              create: media.map((m, index) => ({
                url: m.url,
                kind: m.kind,
                order: m.order ?? index,
                sourceType: m.sourceType || 'OWN',
                sourceUrl: m.sourceUrl || null,
              })),
            }
          : undefined,
    },
    include: {
      media: { orderBy: { order: 'asc' } },
    },
  });
  // 📧 Support email მხოლოდ PENDING-ზე
  if (created.status === 'PENDING') {
sendNewCampaignToSupport({
  campaignId: created.id,
  title: created.title,
  country: created.country,     // e.g. "GE"
  topics: created.topics,       // array
}).catch((e) => console.error('email error (support notify):', e));
  }

  return created;
}

// Campaign + media deletion
export async function deleteCampaign(id) {
  return prisma.$transaction(async (tx) => {
    await tx.campaignMedia.deleteMany({
      where: { campaignId: id },
    });

    return tx.campaign.delete({
      where: { id },
    });
  });
}

export async function setCampaignStatus(id, status) {
  // 1) DB update ტრანზაქციით (იგივე ლოგიკა)
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.campaign.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, role: true, email: true, badges: true },
        },
      },
    });

    if (!existing) {
      const err = new Error('Campaign not found');
      err.status = 404;
      throw err;
    }

    const updated = await tx.campaign.update({
      where: { id },
      data: { status },
    });

    // badges increment მხოლოდ იმ შემთხვევაში, რაც აქამდე გქონდა
    let badgesAfter = existing?.createdBy?.badges ?? null;

    if (
      existing.status === 'PENDING' &&
      status === 'APPROVED' &&
      existing.createdBy &&
      existing.createdBy.role !== 'ADMIN'
    ) {
      const u = await tx.user.update({
        where: { id: existing.createdBy.id },
        data: { badges: { increment: 1 } },
        select: { badges: true },
      });
      badgesAfter = u.badges;
    }

    return { existing, updated, badgesAfter };
  });

  // 2) Email ტრანზაქციის გარეთ
  const { existing, updated, badgesAfter } = result;

  console.log('DECISION EMAIL DEBUG', {
    to: existing?.createdBy?.email,
    role: existing?.createdBy?.role,
    status,
    campaignId: updated?.id,
    title: updated?.title,
    badgesAfter,
  });

  // user-ს ვწერთ მხოლოდ მაშინ, როცა ADMIN-ის campaign არ არის და აქვს email
  if (existing?.createdBy?.role !== 'ADMIN' && existing?.createdBy?.email) {
    if (status === 'APPROVED' || status === 'REJECTED') {
      sendCampaignDecisionToUser({
        toEmail: existing.createdBy.email,
        campaignId: updated.id,
        title: updated.title,
        status,
        badges: badgesAfter, // ✅ badge count გადადის email-ში
      })
        .then((r) => console.log('decision email sent:', r))
        .catch((e) => {
          console.error('email error (user decision):', e?.message || e);
          console.error('full error:', e);
        });
    }
  } else {
    console.log('DECISION EMAIL SKIPPED (no recipient)', {
      hasCreatedBy: !!existing?.createdBy,
      role: existing?.createdBy?.role,
      email: existing?.createdBy?.email,
    });
  }

  return updated;
}

// ერთი კამპანიის წამოღება (სრული მონაცემები edit-ისთვის)
export async function getCampaignById(id) {
  return prisma.campaign.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, email: true, role: true },
      },
      media: { orderBy: { order: 'asc' } },
    },
  });
}

/**
 * Admin edit: კამპანიის სრულად განახლება + media (keep/remove/add)
 * data ფორმატი (frontend-იდან უნდა მოვიდეს ასე):
 * {
 *  title, description, country,
 *  topics, subtopics, tools, subTools,
 *  startDate, endDate, isOngoing,
 *  mediaSourceType, mediaSourceUrl,
 *  keepMediaIds: number[],
 *  newMedia: [{ url, kind, sourceType?, sourceUrl? }]
 * }
 */
export async function updateCampaignAsAdmin(id, data) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.campaign.findUnique({
      where: { id },
      include: { media: { orderBy: { order: 'asc' } } },
    });

    if (!existing) {
      const err = new Error('Campaign not found');
      err.status = 404;
      throw err;
    }

    const {
      title,
      description,
      country,
      topics,
      subtopics,
      tools,
      subTools,
      startDate,
      endDate,
      isOngoing,
      referenceType,
      references,

      // campaign-level UI controls (UploadPage-დან)
      mediaSourceType,
      mediaSourceUrl,

      keepMediaIds,
      newMedia,
    } = data ?? {};
if (referenceType === 'EXTERNAL' && (!references || !references.trim())) {
  const err = new Error('Reference is required when source is external');
  err.status = 400;
  throw err;
}
    // --- media: determine what to keep ---
    const keepSet = new Set(
      Array.isArray(keepMediaIds) ? keepMediaIds.map((x) => Number(x)) : []
    );

    // delete removed media rows (only those belonging to this campaign)
    await tx.campaignMedia.deleteMany({
      where: {
        campaignId: id,
        id: { notIn: Array.from(keepSet) },
      },
    });

    // get kept media (after delete)
    const keptMedia = await tx.campaignMedia.findMany({
      where: {
        campaignId: id,
        ...(keepSet.size ? { id: { in: Array.from(keepSet) } } : { id: -1 }),
      },
      orderBy: { order: 'asc' },
    });

    // --- new media create ---
    const toCreate = Array.isArray(newMedia) ? newMedia : [];

    // normalize source overrides:
    // თუ UploadPage-დან sourceType/sourceUrl მოვიდა, მაშინ ყველა media-ზე ერთნაირად გადავატარებთ
    // (რადგან UI campaign-level-ია)
    const overrideSourceType =
      mediaSourceType === 'OWN' || mediaSourceType === 'EXTERNAL'
        ? mediaSourceType
        : null;

    const overrideSourceUrl =
      overrideSourceType === 'EXTERNAL' && typeof mediaSourceUrl === 'string'
        ? mediaSourceUrl.trim() || null
        : null;

    // order: ჯერ დარჩენილი ძველები თავიანთი რიგით, მერე ახალიები ბოლოს
    const baseOrder = keptMedia.length;

    if (toCreate.length) {
      await tx.campaignMedia.createMany({
        data: toCreate.map((m, idx) => ({
          campaignId: id,
          url: m.url,
          kind: m.kind,
          order: baseOrder + idx,
          sourceType: overrideSourceType || m.sourceType || 'OWN',
          sourceUrl:
            overrideSourceType === 'EXTERNAL'
              ? overrideSourceUrl
              : m.sourceUrl || null,
        })),
      });
    }

    // update order for kept media sequentially 0..N-1
    // (საინტერესოა: თუ keepSet ცარიელია, keptMedia ცარიელია და არაფერი კეთდება)
await Promise.all(
  keptMedia.map((m, index) =>
    tx.campaignMedia.update({
      where: { id: m.id },
      data: {
        order: index,
        ...(overrideSourceType
          ? {
              sourceType: overrideSourceType,
              sourceUrl: overrideSourceType === 'EXTERNAL' ? overrideSourceUrl : null,
            }
          : {}),
      },
    })
  )
);


    // fetch full media after changes
    const finalMedia = await tx.campaignMedia.findMany({
      where: { campaignId: id },
      orderBy: { order: 'asc' },
    });

    // compute imageUrl/videoUrl from final media if missing
    const firstImage = finalMedia.find((m) => m.kind === 'IMAGE');
    const firstVideo = finalMedia.find((m) => m.kind === 'VIDEO');

    const computedImageUrl = firstImage ? firstImage.url : null;
    const computedVideoUrl = firstVideo ? firstVideo.url : null;

    const updated = await tx.campaign.update({
      where: { id },
      data: {
        title: typeof title === 'string' ? title : existing.title,
        description:
          typeof description === 'string' ? description : existing.description,

        country: country ?? null,

        topics: Array.isArray(topics) ? topics : [],
        subtopics: Array.isArray(subtopics) ? subtopics : [],
        tools: Array.isArray(tools) ? tools : [],
        subTools: Array.isArray(subTools) ? subTools : [],

        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: isOngoing ? null : endDate ? new Date(endDate) : null,
        isOngoing: !!isOngoing,
referenceType: referenceType || existing.referenceType,
references:
  referenceType === 'EXTERNAL'
    ? references.trim()
    : referenceType === 'OWN'
      ? null
      : existing.references,
        imageUrl: computedImageUrl,
        videoUrl: computedVideoUrl,
      },
      include: { media: { orderBy: { order: 'asc' } } },
    });

    return updated;
  });
}
