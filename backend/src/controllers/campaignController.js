// backend/src/controllers/campaignController.js
import * as campaignService from '../services/campaignService.js';
import { prisma } from '../config/prisma.js';

// GET /api/campaigns → public approved campaigns
export async function getPublicCampaigns(req, res, next) {
  try {
    const campaigns = await campaignService.listApprovedCampaigns();
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/campaigns → all campaigns (admin)
export async function getAllCampaigns(req, res, next) {
  try {
    const campaigns = await campaignService.listAllCampaigns();
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
}


// POST /api/campaigns → new campaign
export async function createNewCampaign(req, res, next) {
  try {
    // 🎯 საერთოდ აღარ ვედაოთ, უბრალოდ body-ს მთლიანად ვგზავნით
    const campaign = await campaignService.createCampaign(req.body, req.user);

    res.status(201).json({ campaign });
  } catch (err) {
    next(err);
  }
}


// PATCH /api/admin/campaigns/:id/status
export async function updateCampaignStatus(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const updated = await campaignService.setCampaignStatus(id, status);
    res.json({ campaign: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/campaigns/:id
export async function deleteCampaign(req, res, next) {
  try {
    const id = Number(req.params.id);
    await campaignService.deleteCampaign(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
// GET /api/categories → topics + subtopics + tools (public for upload form)
export async function getPublicCategories(req, res, next) {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { name: 'asc' },
      include: {
        subtopics: {
          orderBy: { name: 'asc' },
        },
      },
    });

    const tools = await prisma.tool.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        subTools: {
          orderBy: { name: 'asc' },
        },
      },
    });

    res.json({ topics, tools });
  } catch (err) {
    next(err);
  }
}
