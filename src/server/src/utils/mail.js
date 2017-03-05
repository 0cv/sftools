import { config } from '../../config'
const helper = require('sendgrid').mail;
const sg = require('sendgrid')(config.sendgrid_apikey);

export async function sendMail(mail_infos) {
  console.log('1')
  const from_email = new helper.Email('sftools@sftools.com')
  const subject = mail_infos.subject
  const content = new helper.Content(mail_infos.type || 'text/plain', mail_infos.text)

  if(typeof mail_infos.to === 'string') {
    mail_infos.to = [mail_infos.to]
  }

  let to_email = new helper.Email(mail_infos.to[0])
  const mail = new helper.Mail(from_email, subject, to_email, content)

  mail_infos.to.shift()

  for(let to of mail_infos.to) {
    let email = new helper.Email(to)
    mail.personalizations[0].addTo(email)
  }

  const request = sg.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON()
  })

  const response = await sg.API(request)

  console.log(response.statusCode);
  console.log(response.body);
  console.log(response.headers);
  return response
}
