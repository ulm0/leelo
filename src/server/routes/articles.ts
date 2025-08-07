import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { addJob, retryExtractionJob, cleanupStuckExtractions } from '../services/queue.js';

const addArticleSchema = z.object({
  url: z.string().url(),
  tags: z.array(z.string()).optional(),
});

const updateArticleSchema = z.object({
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const importCsvSchema = z.object({
  csvData: z.string(),
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  search: z.string().optional(),
  tag: z.string().optional(),
  isRead: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  isArchived: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  isFavorite: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
});

const articleRoutes: FastifyPluginAsync = async (fastify) => {
  // Get articles
  fastify.get('/', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const query = querySchema.parse(request.query);
    const userId = request.user.userId;
    
    const { page, limit, search, tag, isRead, isArchived, isFavorite } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      userId,
    };

    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        { title: { contains: searchLower } },
        { author: { contains: searchLower } },
        { excerpt: { contains: searchLower } },
      ];
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            name: tag,
          },
        },
      };
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (isArchived !== undefined) {
      where.isArchived = isArchived;
    }

    if (isFavorite !== undefined) {
      where.isFavorite = isFavorite;
    }

    const [articles, total] = await Promise.all([
      fastify.prisma.article.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      fastify.prisma.article.count({ where }),
    ]);

    const formattedArticles = articles.map(article => ({
      ...article,
      tags: article.tags.map(at => at.tag),
    }));

    return {
      articles: formattedArticles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  });

  // Get single article
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const article = await fastify.prisma.article.findFirst({
      where: { id, userId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!article) {
      return reply.code(404).send({ error: 'Article not found' });
    }

    return {
      ...article,
      tags: article.tags.map(at => at.tag),
    };
  });

  // Add new article
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { url, tags = [] } = addArticleSchema.parse(request.body);
      const userId = request.user.userId;

      // Check if article already exists for this user
      const existingArticle = await fastify.prisma.article.findFirst({
        where: { url, userId },
      });

      if (existingArticle) {
        return reply.code(400).send({ error: 'Article already exists' });
      }

      // Create article with basic info
      const article = await fastify.prisma.article.create({
        data: {
          url,
          title: 'Extracting...', // Temporary title
          userId,
        },
      });

                // Add tags if provided
          if (tags.length > 0) {
            const tagRecords = await Promise.all(
              tags.map(async (tagName: string) => {
                return fastify.prisma.tag.upsert({
                  where: {
                    name_userId: {
                      name: tagName,
                      userId,
                    },
                  },
                  create: {
                    name: tagName,
                    userId,
                  },
                  update: {},
                });
              })
            );

        await fastify.prisma.articleTag.createMany({
          data: tagRecords.map(tag => ({
            articleId: article.id,
            tagId: tag.id,
          })),
        });
      }

      // Queue extraction job
      await addJob({
        type: 'extract-article',
        data: {
          articleId: article.id,
          url,
          userId,
        },
      });

      return { 
        article: {
          ...article,
          tags: tags.map(name => ({ name })),
        },
        message: 'Article added and extraction started'
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      throw error;
    }
  });

  // Update article
  fastify.patch('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updates = updateArticleSchema.parse(request.body);
      const userId = request.user.userId;

      // Check if article exists and belongs to user
      const existingArticle = await fastify.prisma.article.findFirst({
        where: { id, userId },
      });

      if (!existingArticle) {
        return reply.code(404).send({ error: 'Article not found' });
      }

      // Update article
      const { tags, ...articleUpdates } = updates;
      
      const article = await fastify.prisma.article.update({
        where: { id },
        data: articleUpdates,
      });

      // Update tags if provided
      if (tags !== undefined) {
        // Remove existing tags
        await fastify.prisma.articleTag.deleteMany({
          where: { articleId: id },
        });

        // Add new tags
        if (tags.length > 0) {
          const tagRecords = await Promise.all(
            tags.map(async (tagName) => {
              return fastify.prisma.tag.upsert({
                where: {
                  name_userId: {
                    name: tagName,
                    userId,
                  },
                },
                create: {
                  name: tagName,
                  userId,
                },
                update: {},
              });
            })
          );

          await fastify.prisma.articleTag.createMany({
            data: tagRecords.map(tag => ({
              articleId: id,
              tagId: tag.id,
            })),
          });
        }
      }

      // Fetch updated article with tags
      const updatedArticle = await fastify.prisma.article.findUnique({
        where: { id },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      return {
        ...updatedArticle,
        tags: updatedArticle?.tags.map(at => at.tag) || [],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      throw error;
    }
  });

  // Delete article
  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const article = await fastify.prisma.article.findFirst({
      where: { id, userId },
    });

    if (!article) {
      return reply.code(404).send({ error: 'Article not found' });
    }

    await fastify.prisma.article.delete({
      where: { id },
    });

    return { message: 'Article deleted successfully' };
  });

  // Get user's tags
  fastify.get('/tags/list', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = request.user.userId;

    const tags = await fastify.prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { tags };
  });

  // Get reading stats
  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = request.user.userId;

    const [total, read, unread, archived, favorites] = await Promise.all([
      fastify.prisma.article.count({ where: { userId } }),
      fastify.prisma.article.count({ where: { userId, isRead: true } }),
      fastify.prisma.article.count({ where: { userId, isRead: false } }),
      fastify.prisma.article.count({ where: { userId, isArchived: true } }),
      fastify.prisma.article.count({ where: { userId, isFavorite: true } }),
    ]);

    return {
      total,
      read,
      unread,
      archived,
      favorites,
    };
  });

  // Retry extraction for a specific article
  fastify.post('/:id/retry-extraction', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user.userId;

    const article = await fastify.prisma.article.findFirst({
      where: { id, userId },
    });

    if (!article) {
      return reply.code(404).send({ error: 'Article not found' });
    }

    try {
      await retryExtractionJob(id);
      return { message: 'Extraction job queued for retry' };
    } catch (error) {
      console.error('Failed to retry extraction:', error);
      return reply.code(500).send({ error: 'Failed to queue retry job' });
    }
  });

  // Admin endpoint to cleanup stuck extractions
  fastify.post('/cleanup-stuck-extractions', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    if (!request.user.isAdmin) {
      return reply.code(403).send({ error: 'Admin access required' });
    }

    try {
      const result = await cleanupStuckExtractions();
      return { 
        message: `Cleaned up ${result.cleaned} stuck extractions`,
        cleaned: result.cleaned 
      };
    } catch (error) {
      console.error('Failed to cleanup stuck extractions:', error);
      return reply.code(500).send({ error: 'Failed to cleanup stuck extractions' });
    }
  });

  // Get extraction status for articles
  fastify.get('/extraction-status', {
    preHandler: [fastify.authenticate],
  }, async (request) => {
    const userId = request.user.userId;

    const statusCounts = await fastify.prisma.article.groupBy({
      by: ['extractionStatus'],
      where: { userId },
      _count: {
        _all: true,
      },
    });

    const statusMap = Object.fromEntries(
      statusCounts.map(item => [item.extractionStatus, item._count._all])
    );

    return {
      pending: statusMap.pending || 0,
      extracting: statusMap.extracting || 0,
      completed: statusMap.completed || 0,
      failed: statusMap.failed || 0,
    };
  });

  // Import articles from CSV
  fastify.post('/import-csv', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { csvData } = importCsvSchema.parse(request.body);
      const userId = request.user.userId;

      // Parse CSV data
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate headers (Pocket format)
      const expectedHeaders = ['title', 'url', 'time_added', 'tags', 'status'];
      if (!expectedHeaders.every(h => headers.includes(h))) {
        return reply.code(400).send({ 
          error: 'Invalid CSV format. Expected headers: title, url, time_added, tags, status' 
        });
      }

      const articles = [];
      const errors = [];
      let importedCount = 0;
      let skippedCount = 0;

      // Process each line (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        try {
          // Simple CSV parsing (handles quoted fields)
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          if (values.length !== headers.length) {
            errors.push(`Line ${i + 1}: Invalid number of columns`);
            continue;
          }

          const row = Object.fromEntries(
            headers.map((header, index) => [header, values[index]])
          );

          const { title, url, tags: tagsString, status } = row;

          // Skip if no URL
          if (!url || url === 'url') continue;

          // Check if article already exists
          const existingArticle = await fastify.prisma.article.findFirst({
            where: { url, userId },
          });

          if (existingArticle) {
            skippedCount++;
            continue;
          }

          // Parse tags
          const tags = tagsString ? tagsString.split('|').map((t: string) => t.trim()).filter((t: string) => t) : [];

          // Create article
          const article = await fastify.prisma.article.create({
            data: {
              url,
              title: title || 'Imported Article',
              userId,
              isRead: status === 'read',
              isArchived: status === 'archived',
            },
          });

          // Add tags if provided
          if (tags.length > 0) {
            const tagRecords = await Promise.all(
              tags.map(async (tagName) => {
                return fastify.prisma.tag.upsert({
                  where: {
                    name_userId: {
                      name: tagName,
                      userId,
                    },
                  },
                  create: {
                    name: tagName,
                    userId,
                  },
                  update: {},
                });
              })
            );

            await fastify.prisma.articleTag.createMany({
              data: tagRecords.map(tag => ({
                articleId: article.id,
                tagId: tag.id,
              })),
            });
          }

          // Queue extraction job
          await addJob({
            type: 'extract-article',
            data: {
              articleId: article.id,
              url,
              userId,
            },
          });

          articles.push(article);
          importedCount++;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Line ${i + 1}: ${errorMessage}`);
        }
      }

      return {
        message: `Import completed`,
        imported: importedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
      };

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      throw error;
    }
  });

  // Export articles to CSV
  fastify.get('/export-csv', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = request.user.userId;
    const query = querySchema.parse(request.query);
    const { search, tag, isRead, isArchived, isFavorite } = query;

    // Build where clause
    const where: any = {
      userId,
    };

    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        { title: { contains: searchLower } },
        { author: { contains: searchLower } },
        { excerpt: { contains: searchLower } },
      ];
    }

    if (tag) {
      where.tags = {
        some: {
          tag: {
            name: tag,
          },
        },
      };
    }

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    if (isArchived !== undefined) {
      where.isArchived = isArchived;
    }

    if (isFavorite !== undefined) {
      where.isFavorite = isFavorite;
    }

    const articles = await fastify.prisma.article.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert to Pocket CSV format
    const csvRows = ['title,url,time_added,tags,status'];
    
    for (const article of articles) {
      const title = article.title ? `"${article.title.replace(/"/g, '""')}"` : '';
      const url = article.url;
      const timeAdded = Math.floor(new Date(article.createdAt).getTime() / 1000);
      const tags = article.tags.map(at => at.tag.name).join('|');
      const status = article.isArchived ? 'archived' : article.isRead ? 'read' : 'unread';
      
      csvRows.push(`${title},${url},${timeAdded},${tags},${status}`);
    }

    const csvContent = csvRows.join('\n');
    
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="leelo-export.csv"')
      .send(csvContent);
  });
};

export default articleRoutes;