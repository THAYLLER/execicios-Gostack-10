import * as Yup from 'yup';
import {startOfDay, parseISO, isBefore, format, subHours} from 'date-fns';
import pt from 'date-fns/locale/pt';

import Users from '../models/Users';
import Appointment from '../models/Appointment';
import File from '../models/File';
import Notification from '../schemas/Notification';

import CancellationMail from  '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {

  async index(req, res) {
    const { page = 1 }  = req.query;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null},
      order: ['date'],
      attributes: ['id','date', 'past','cancelable'],
      limit: 20,
      offset: (page  - 1) * 20,
      include: [
        {
          model: Users,
          attributes: ['id','name'],
          include: [
            {
              model: File,
              attributes: ['id','path','url']
            }
          ]
        }
      ]
    });
    return res.json(appointments);
  }
  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if(!(await schema.isValid(req.body))) {
      return res
        .status(400)
        .json({ error: 'Validation fails'});
    }

    const { provider_id, date} = req.body;

    const checkIsProvider = await Users.findOne({
      where: { id: provider_id, provider: true},
    });

    if(!checkIsProvider) {
      return res
        .status(401)
        .json({ error: 'You can only create appointments with providers'});
    }

    const hourstart = startOfDay(parseISO(date));

    if(isBefore(hourstart, new Date())){
      return res
        .status(400)
        .json({ error: 'Past dates are not permitted' });
    }

    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourstart,
      },
    });

    if(checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date
    });

    const user = await Users.findByPk(req.userId);
    const formattedDAte = format(
      hourstart,
      "'dia' dd 'de' MMM', ás' H:mm'h",
      {locale: pt}
    )

    await Notification.create({
      content: `Novo agendamento ${user.name} para o ${formattedDAte}`,
      user: provider_id,
    })

    return res.json(appointment);
  }

  async delete(req, res){

    const appointment = await Appointment.findByPk(req.params.id,{
      include: [
        {
          model: Users,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: Users,
          as: 'user',
          attributes: ['name'],
        }
      ]
    });

    if(appointments.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don 't have permission to cancel this appointment.",
      });
    }

    const dateWithSub = subHours(appointments.date, 2);

    if(isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: "You can only cancel appointments 2 hours in advance.",
      });
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
