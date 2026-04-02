
Sub GEP_Expedicao2()

'Tip:
' 1. Use the <CTRL+SPACE> or <CTRL+I> shortcut to open a list of all objects and functions
' 2. Write the code using the HMI Runtime object.
'  Example: HmiRuntime.Screens("Screen_1").
' 3. Use the <CTRL+J> shortcut to create an object reference.
'Write the code as of this position:

Dim DataTime
Dim folder_y_m, folder_day, EX2, filepath, var, header,filepath_C
Dim fso, fso1, fso2, fso3  
Dim H, Min, S, d, Mon, Y
Dim val10,val11,val12,val13,val14,val15,val16,val17,val18
Dim ValT(18)
Dim i


ValT(10)= SmartTags("Pos_P2A03") 'Sinaliza acoplado tromba 2 - GEP (1 - Acoplado e 2 - Desacoplado)
ValT(11)= SmartTags("P2P05.Sts_Corrente") 'Leitura corrente em porcentagem eclusa filtro desp.tromba extração silo 2
ValT(12)= SmartTags("P2P05.Sts_Corrente_Perc") 'Leitura corrente em amperes eclusa filtro desp.tromba extração silo 2
ValT(13)= SmartTags("P2P06.Sts_Corrente") 'Leitura corrente em porcentagem ventilador filtro desp.tromba extr. silo 2
ValT(14)= SmartTags("P2P06.Sts_Corrente_Perc") 'Leitura corrente em amperes ventilador filtro desp.tromba extr. silo 2
ValT(15)= SmartTags("P2J01.Sts.current") 'Leitura corrente em porcentagem soprador de fluidização do silo cimento 2
ValT(16)= SmartTags("P2J01.Sts.currentPerc") 'Leitura corrente em amperes soprador de fluidização do silo cimento 2
ValT(17)= SmartTags("P5J01.Sts.current") 'Leitura corrente em porcentagem soprador reserva fluidização dos silos cimento
ValT(18)= SmartTags("P5J01.Sts.currentPerc")  'Leitura corrente em amperes soprador reserva fluidização dos silos cimento

'Formarta e arredunda os valores 
For i = 10 To 18
	
        If i < 19 Then
     ValT(i) =   FormatNumber(ValT(i),2,True,False,False)
       
           End If 
Next 

Mon = Right("00" & Month (Now()),2)
Y = Year(Date())
d = Right("00" & Day (Now()),2)
H = Right("00"& Hour(Time()),2)
Min = Right("00"& Minute(Time()),2)
S = Second(Time())
  
DataTime= d & Mon & Y

EX2 = DataTime & ".EX2"
'Create Folder year_month
'Set fso = CreateObject("Scripting.FileSystemObject")
'folder_y_m = "Z:\RELATORIOS\" & Y & "_" & Mon
'If Not fso.FolderExists(folder_y_m) Then
' fso.CreateFolder (folder_y_m)
'End If
'Create Folder day
'Set fso1 = CreateObject("Scripting.FileSystemObject")
'folder_day = folder_y_m & "\" & d
'If Not fso1.FolderExists(folder_day) Then
' fso1.CreateFolder (folder_day)
'End If
'Create File Excel
Set fso2 = CreateObject("Scripting.FileSystemObject")
filepath_C = "C:\\Relatorios" & folder_day & "\" & EX2


'Salva no pasta c:\\Relatorios
If Not fso2.FileExists(filepath_C) Then
 fso2.CreateTextFile(filepath_C)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath_C,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath_C,8,1)
fso3.WriteLine Y & Mon & d & H & Min &  ";" & ValT(10) & ";" & ValT(11) & ";" & ValT(12) & ";" & ValT(13) & ";" & ValT(14) & ";" & ValT(15) & ";" & ValT(16) & ";" & ValT(17) & ";" & ValT(18) 
fso3.Close

'Salva no pasta z:\\
filepath = "Z:\\" & folder_day & "\" & EX2
If Not fso2.FileExists(filepath) Then
 fso2.CreateTextFile(filepath)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath,8,1)
fso3.WriteLine Y & Mon & d & H & Min &  ";" & ValT(10) & ";" & ValT(11) & ";" & ValT(12) & ";" & ValT(13) & ";" & ValT(14) & ";" & ValT(15) & ";" & ValT(16) & ";" & ValT(17) & ";" & ValT(18)
fso3.Close




End Sub