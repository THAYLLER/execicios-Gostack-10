import { startOfDay, endOfDay, parseISO} from 'date-fns';
import { Op } from 'sequelize';

import Appointment from '../models/Appointment';
import Users from '../models/Users';

class ScheduleController {
  async index(req, res) {
    const checkUserProvider = await Users.findOne({
      where: { id: req.userId, provider:true},
    });

    if(!checkUserProvider) {
      return res.status(401).json({ error: 'User is not a provider' });
    }

    const { date } = req.query;
    const parseDate = parseISO(date);

    const appointments = await Appointment.findAll({
      where: {
        provider_id: req.userId,
        canceled_at: null,
        date: {
          [Op.between]: [
            startOfDay(parseDate),
            endOfDay(parseDate)
          ],
        },
      },
      order: ['date'],
    });

    return res.json(appointments);
  }
}

export default new ScheduleController();
