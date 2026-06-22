import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const CONTACT_STATUSES = [
  'new',
  'to_contact',
  'contacted',
  'qualified',
  'converted',
  'closed',
  'unreachable',
];

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Prisma nomme automatiquement la relation :
   * contact_message_history
   *
   * Le frontend utilise :
   * history
   *
   * Cette méthode convertit uniquement la réponse.
   * Elle ne modifie ni Prisma ni la base.
   */
  private formatContact(contact: any) {
    if (!contact) {
      return contact;
    }

    const {
      contact_message_history,
      ...contactData
    } = contact;

    return {
      ...contactData,
      history: contact_message_history || [],
    };
  }

  async create(body: any) {
    const name = String(body.name || '').trim();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const phone = String(body.phone || '').trim();
    const subject =
      String(body.subject || '').trim() ||
      'Demande depuis le site';
    const message = String(body.message || '').trim();

    if (!name) {
      throw new BadRequestException(
        'name is required',
      );
    }

    if (!email || !email.includes('@')) {
      throw new BadRequestException(
        'Valid email is required',
      );
    }

    if (!message) {
      throw new BadRequestException(
        'message is required',
      );
    }

    return this.prisma.$transaction(async tx => {
      const contact =
        await tx.contact_messages.create({
          data: {
            name,
            email,
            phone: phone || null,
            subject,
            message,
            status: 'new',
            is_read: false,
            updated_at: new Date(),
          },
        });

      await tx.contact_message_history.create({
        data: {
          contact_message_id: contact.id,
          status: 'new',
          note: 'Demande reçue depuis le site web',
        },
      });

      const createdContact =
        await tx.contact_messages.findUnique({
          where: {
            id: contact.id,
          },
          include: {
            contact_message_history: {
              orderBy: {
                created_at: 'asc',
              },
            },
          },
        });

      return this.formatContact(createdContact);
    });
  }

  async findAll(query: any = {}) {
    const status = String(
      query.status || '',
    ).trim();

    const search = String(
      query.search || '',
    ).trim();

    const contacts =
      await this.prisma.contact_messages.findMany({
        where: {
          ...(status && {
            status,
          }),

          ...(search && {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                phone: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                subject: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                message: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }),
        },

        include: {
          contact_message_history: {
            orderBy: {
              created_at: 'asc',
            },
          },
        },

        orderBy: {
          created_at: 'desc',
        },
      });

    return contacts.map(contact =>
      this.formatContact(contact),
    );
  }

  async update(
    id: number,
    body: any,
    user?: any,
  ) {
    const contact =
      await this.prisma.contact_messages.findUnique({
        where: {
          id,
        },
      });

    if (!contact) {
      throw new NotFoundException(
        'Contact message not found',
      );
    }

    const nextStatus =
      body.status || contact.status;

    if (!CONTACT_STATUSES.includes(nextStatus)) {
      throw new BadRequestException(
        'Invalid contact status',
      );
    }

    let nextActionAt = contact.next_action_at;

    if (body.next_action_at === null) {
      nextActionAt = null;
    } else if (body.next_action_at) {
      nextActionAt = new Date(
        body.next_action_at,
      );

      if (
        Number.isNaN(nextActionAt.getTime())
      ) {
        throw new BadRequestException(
          'Invalid next action date',
        );
      }
    }

    const note = String(
      body.note || '',
    ).trim();

    return this.prisma.$transaction(async tx => {
      await tx.contact_messages.update({
        where: {
          id,
        },

        data: {
          status: nextStatus,

          is_read:
            body.is_read !== undefined
              ? Boolean(body.is_read)
              : true,

          admin_notes:
            body.admin_notes !== undefined
              ? String(
                  body.admin_notes || '',
                ).trim() || null
              : contact.admin_notes,

          next_action_at: nextActionAt,

          assigned_to_user_id:
            body.assigned_to_user_id !==
            undefined
              ? body.assigned_to_user_id
                ? Number(
                    body.assigned_to_user_id,
                  )
                : null
              : contact.assigned_to_user_id,

          updated_at: new Date(),
        },
      });

      const hasChanged =
        nextStatus !== contact.status ||
        Boolean(note);

      if (hasChanged) {
        await tx.contact_message_history.create({
          data: {
            contact_message_id: id,
            status: nextStatus,
            note: note || null,

            created_by_user_id: user?.sub
              ? Number(user.sub)
              : null,
          },
        });
      }

      /*
       * On relit après la création de l'historique.
       * Ainsi, la réponse contient immédiatement
       * la nouvelle entrée.
       */
      const updatedContact =
        await tx.contact_messages.findUnique({
          where: {
            id,
          },

          include: {
            contact_message_history: {
              orderBy: {
                created_at: 'asc',
              },
            },
          },
        });

      return this.formatContact(updatedContact);
    });
  }
}