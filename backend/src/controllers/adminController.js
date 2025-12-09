// backend/src/controllers/adminController.js
import { prisma } from '../config/prisma.js';
import {
  listAllCampaigns,
  setCampaignStatus,
  deleteCampaign as deleteCampaignService, // 👈 ეს დაგავიწყდა, უნდა იყოს
} from '../services/campaignService.js';


// ყველა კამპანია (admin panel)
export async function getAllCampaigns(req, res, next) {
  try {
    const campaigns = await listAllCampaigns();
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
}

// campaign approve
export async function approveCampaign(req, res, next) {
  try {
    const id = Number(req.params.id);
    const updated = await setCampaignStatus(id, 'APPROVED');
    res.json({ campaign: updated });
  } catch (err) {
    next(err);
  }
}

// campaign reject
export async function rejectCampaign(req, res, next) {
  try {
    const id = Number(req.params.id);
    const updated = await setCampaignStatus(id, 'REJECTED');
    res.json({ campaign: updated });
  } catch (err) {
    next(err);
  }
}

// campaign delete ერთ ცალზე
export async function removeCampaign(req, res, next) {
  try {
    const id = Number(req.params.id);
    await deleteCampaignService(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Users + სტატისტიკა
export async function getUsersWithStats(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        campaigns: {
          select: { id: true, status: true },
        },
      },
    });

    const result = users.map((u) => {
      const total = u.campaigns.length;
      const approved = u.campaigns.filter((c) => c.status === 'APPROVED').length;
      const rejected = u.campaigns.filter((c) => c.status === 'REJECTED').length;

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        country: u.country,
        isBlocked: u.isBlocked,
        createdAt: u.createdAt,
        role: u.role,
        totalCampaigns: total,
        approvedCampaigns: approved,
        rejectedCampaigns: rejected,
      };
    });

    res.json({ users: result });
  } catch (err) {
    next(err);
  }
}

// 🔒 Block user
export async function blockUser(req, res, next) {
  try {
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (user.role === 'ADMIN') {
      const err = new Error('Cannot block admin user');
      err.status = 400;
      throw err;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isBlocked: true },
    });

    res.json({
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        isBlocked: updated.isBlocked,
      },
    });
  } catch (err) {
    next(err);
  }
}



/**
 * 🔓 Unblock user
 */
export async function unblockUser(req, res, next) {
  try {
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    await prisma.user.update({
      where: { id },
      data: { isBlocked: false },
    });

    const updated = await prisma.user.findUnique({ where: { id } });
    res.json({
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        isBlocked: updated.isBlocked,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 🗑 Delete user (კამპანიებს აღარ შლის)
export async function deleteUser(req, res, next) {
  try {
    const id = Number(req.params.id);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    if (user.role === 'ADMIN') {
      const err = new Error('Cannot delete admin user');
      err.status = 400;
      throw err;
    }

    // Campaign.createdBy-ზე გაქვს onDelete: SetNull, ასე რომ
    // იუზერის წაშლისას კამპანიები დარჩება და createdById გახდება NULL.
    await prisma.user.delete({ where: { id } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ---------- CATEGORIES (Topics / SubTopics / Tools) ----------

// GET /admin/categories
// GET /admin/categories
export async function getCategories(req, res, next) {
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


// POST /admin/topics
export async function createTopic(req, res, next) {
  try {
    const { name } = req.body ?? {};   // ✅ body თუ არაა, ცარიელს გამოიყენებს
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Topic name is required' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Topic name is required' });
    }

    const topic = await prisma.topic.create({
      data: { name: name.trim() },
    });

    res.status(201).json({ topic });
  } catch (err) {
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ message: 'Topic with this name already exists' });
    }
    next(err);
  }
}

// DELETE /admin/topics/:id
export async function deleteTopic(req, res, next) {
  try {
    const id = Number(req.params.id);

    await prisma.topic.delete({
      where: { id },
    });

    // Subtopics იშლება Cascade-ით
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// POST /admin/topics/:topicId/subtopics
export async function createSubtopic(req, res, next) {
  try {
    const topicId = Number(req.params.topicId);
    const { name } = req.body ?? {};

    if (!topicId || Number.isNaN(topicId)) {
      return res.status(400).json({ message: 'Invalid topicId' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Sub-topic name is required' });
    }

    const subtopic = await prisma.subTopic.create({
      data: {
        name: name.trim(),
        topicId: topicId,      // ✅ ზუსტად ეს ველი
      },
    });

    res.status(201).json({ subtopic });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        message: 'Sub-topic with this name already exists for this topic',
      });
    }
    next(err);
  }
}


// DELETE /admin/subtopics/:id
export async function deleteSubtopic(req, res, next) {
  try {
    const id = Number(req.params.id);

    await prisma.subTopic.delete({
      where: { id },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// GET /admin/tools
export async function getTools(req, res, next) {
  try {
    const tools = await prisma.tool.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        subTools: {
          orderBy: { name: 'asc' },
        },
      },
    });
    res.json({ tools });
  } catch (err) {
    next(err);
  }
}


// POST /admin/tools
export async function createTool(req, res, next) {
  try {
    const { name } = req.body ?? {};
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Tool name is required' });
    }

    const tool = await prisma.tool.create({
      data: { name: name.trim() },
    });

    res.status(201).json({ tool });
  } catch (err) {
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ message: 'Tool with this name already exists' });
    }
    next(err);
  }
}

// DELETE /admin/tools/:id
export async function deleteTool(req, res, next) {
  try {
    const id = Number(req.params.id);

    await prisma.tool.delete({
      where: { id },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
// POST /admin/tools/:toolId/subtools
export async function createSubTool(req, res, next) {
  try {
    const toolId = Number(req.params.toolId);
    const { name } = req.body ?? {};

    if (!toolId || Number.isNaN(toolId)) {
      return res.status(400).json({ message: 'Invalid toolId' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Sub-tool name is required' });
    }

    const subTool = await prisma.subTool.create({
      data: {
        name: name.trim(),
        toolId,
      },
    });

    res.status(201).json({ subTool });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        message: 'Sub-tool with this name already exists for this tool',
      });
    }
    next(err);
  }
}

// DELETE /admin/subtools/:id
export async function deleteSubTool(req, res, next) {
  try {
    const id = Number(req.params.id);

    await prisma.subTool.delete({
      where: { id },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
